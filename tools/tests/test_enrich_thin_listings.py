#!/usr/bin/env python3
import importlib.util
import json
import sys
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "enrich-thin-listings.py"
SPEC = importlib.util.spec_from_file_location("dgc_enrich_thin_listings", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class EnrichmentSafeguardTests(unittest.TestCase):
    def page(self, url, text, json_ld=None):
        return MODULE.Page(url=url, text=text, links=[], json_ld=json_ld or [])

    def test_parser_ignores_navigation_copy(self):
        page = MODULE.parse_page(
            "https://example.ca/",
            '<header><a href="/grooming">Full groom</a></header><main>Nail trim service</main>',
        )
        self.assertNotIn("Full groom", page.text)
        self.assertIn("Nail trim service", page.text)
        self.assertEqual(page.links[0][0], "/grooming")

    def test_identity_requires_a_distinctive_business_token(self):
        target = MODULE.Target("/route/", "North Star Grooming", "https://example.ca/", "Calgary")
        page = self.page("https://example.ca/", "Completely Different Pet Spa offers dog grooming.")
        self.assertFalse(MODULE.identity_matches(target, page))

    def test_shared_host_uses_only_location_confirmed_service_pages(self):
        target = MODULE.Target("/route/", "Petland Airdrie", "https://petland.ca/", "Airdrie", 5)
        pages = [
            self.page("https://petland.ca/", "Petland provides pet grooming information."),
            self.page("https://petland.ca/calgary/", "Calgary grooming appointments include a full groom."),
            self.page("https://petland.ca/airdrie/", "Airdrie grooming appointments include a self-service dog wash."),
        ]
        entry = MODULE.build_enrichment_entry(target, pages, "direct_html")
        self.assertEqual(entry["services"], ["Self-service dog wash"])
        self.assertEqual(entry["sourcePages"], ["https://petland.ca/airdrie/"])

    def test_shared_host_rejects_generic_chain_page(self):
        target = MODULE.Target("/route/", "Pet Planet Airdrie", "https://petplanet.ca/", "Airdrie", 5)
        pages = [self.page("https://petplanet.ca/", "Pet Planet publishes dog grooming services and appointments.")]
        with self.assertRaisesRegex(ValueError, "did not confirm this listing location"):
            MODULE.build_enrichment_entry(target, pages, "direct_html")

    def test_same_city_chain_requires_branch_level_evidence(self):
        target = MODULE.Target(
            "/route/",
            "Pet Planet Aspen Landing",
            "https://petplanet.ca/",
            "Calgary",
            8,
            "85th Street SW, Calgary, AB T3H 0N9, Canada",
            4,
        )
        generic_pages = [self.page("https://petplanet.ca/", "Pet Planet Calgary grooming services include a full groom.")]
        with self.assertRaisesRegex(ValueError, "did not confirm this listing location"):
            MODULE.build_enrichment_entry(target, generic_pages, "direct_html")

        branch_pages = [
            self.page("https://petplanet.ca/", "Pet Planet publishes grooming information."),
            self.page(
                "https://petplanet.ca/calgary/aspen-landing/",
                "Aspen Landing Calgary grooming services include a full groom.",
            ),
        ]
        entry = MODULE.build_enrichment_entry(target, branch_pages, "direct_html")
        self.assertEqual(entry["sourcePages"], ["https://petplanet.ca/calgary/aspen-landing/"])

    def test_shared_booking_platform_uses_business_identity_not_chain_city_rules(self):
        target = MODULE.Target(
            "/route/",
            "Dogo's World",
            "https://booking.moego.pet/ol/landing?name=DogosWorld",
            "Airdrie",
            30,
            "",
            3,
        )
        pages = [self.page(target.website, "Dogo's World dog grooming services include a full groom appointment.")]
        entry = MODULE.build_enrichment_entry(target, pages, "direct_html")
        self.assertEqual(entry["services"], ["Full groom or haircut"])

    def test_saved_chain_address_can_prove_a_branch_without_recrawling(self):
        target = MODULE.Target(
            "/route/",
            "Pet Valu",
            "https://store.petvalu.ca/location/3202/",
            "Calgary",
            100,
            "404-8338 18th St SE, Calgary, AB T2C 4E4, Canada",
            12,
        )
        matching = {"websiteLocation": "404-8338 18th St SE, Calgary, AB, T2C 4E4", "sourcePages": []}
        generic = {"websiteLocation": "", "sourcePages": ["https://petvalu.ca/grooming/"]}
        self.assertTrue(MODULE.enrichment_confirms_target_branch(matching, target))
        self.assertFalse(MODULE.enrichment_confirms_target_branch(generic, target))

    def test_address_only_related_business_needs_grooming_identity(self):
        address = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "600 Hespeler Road",
                "addressLocality": "Cambridge",
                "addressRegion": "ON",
                "postalCode": "N1R 8H2",
            },
        }
        page = self.page("https://stores.example/cambridge/dog-training", "PetSmart dog training and grooming information.", [address])
        trainer = MODULE.Target("/route/", "PetSmart Dog Training", page.url, "Cambridge", category="Dog trainer")
        with self.assertRaisesRegex(ValueError, "address-only"):
            MODULE.build_enrichment_entry(trainer, [page], "direct_html")
        groomer = MODULE.Target("/route/", "PetSmart Grooming", page.url, "Cambridge", category="Pet groomer")
        self.assertTrue(MODULE.build_enrichment_entry(groomer, [page], "direct_html")["websiteLocation"])

    def test_retail_catalog_home_is_rejected(self):
        target = MODULE.Target("/route/", "Posh Paws", "https://example.ca/products/dog-grooming-kit", "Ottawa")
        pages = [self.page(target.website, "Posh Paws dog grooming services include a full groom.")]
        with self.assertRaisesRegex(ValueError, "retail catalog"):
            MODULE.build_enrichment_entry(target, pages, "direct_html")

    def test_explicit_grooming_session_collection_is_allowed(self):
        target = MODULE.Target(
            "/route/",
            "Vital Pets",
            "https://vitalpets.example/collections/dog-grooming-sessions",
            "Toronto",
        )
        pages = [self.page(target.website, "Vital Pets dog grooming services include a full groom appointment.")]
        entry = MODULE.build_enrichment_entry(target, pages, "direct_html")
        self.assertEqual(entry["services"], ["Full groom or haircut"])

    def test_price_signal_does_not_store_the_amount(self):
        target = MODULE.Target("/route/", "Posh Paws", "https://poshpaws.example/", "Ottawa")
        pages = [self.page(target.website, "Posh Paws dog grooming services. A full groom starts at $75.")]
        entry = MODULE.build_enrichment_entry(target, pages, "direct_html")
        self.assertTrue(entry["pricingAvailable"])
        self.assertNotIn("priceAmounts", entry)
        self.assertNotIn("$75", json.dumps(entry))

    def test_course_tuition_is_not_a_grooming_price_signal(self):
        self.assertFalse(MODULE.has_grooming_price("Online toilettage formation and tools: 2 500$ plus tax."))
        self.assertTrue(MODULE.has_grooming_price("Toilettage complet pour chien: 80 $."))

    def test_author_archive_home_is_rejected(self):
        target = MODULE.Target("/route/", "Kat's Grooming", "https://kats.example/author/katsgrooming/", "Windsor")
        pages = [self.page(target.website, "Kat's Grooming publishes puppy grooming information.")]
        with self.assertRaisesRegex(ValueError, "editorial archive"):
            MODULE.build_enrichment_entry(target, pages, "direct_html")

    def test_booking_labels_are_canonical_and_faq_links_are_dropped(self):
        source = "https://poshpaws.example/services/"
        records = [
            {"name": "What do I need to bring to my appointment?", "url": source},
            {"name": "Schedule your appointment today for $75", "url": "https://booking.example/posh-paws"},
        ]
        self.assertEqual(
            MODULE.sanitize_booking_records(records, [source]),
            [{"name": "Book an appointment", "url": "https://booking.example/posh-paws"}],
        )

    def test_french_first_party_service_terms_are_normalized(self):
        target = MODULE.Target("/route/", "Toilettage Patte Douce", "https://pattedouce.example/", "Laval")
        pages = [
            MODULE.Page(
                url=target.website,
                text=(
                    "Salon de toilettage Patte Douce. Toilettage complet, bain, coupe des griffes, "
                    "nettoyage des oreilles et d\u00e9m\u00ealage. Toilettage complet 80 $."
                ),
                links=[("/rendez-vous", "Prendre rendez-vous")],
                json_ld=[],
            )
        ]
        entry = MODULE.build_enrichment_entry(target, pages, "direct_html")
        self.assertEqual(
            entry["services"],
            ["Full groom or haircut", "Bath or bath-and-brush", "Nail trim or grinding", "Ear cleaning", "De-matting"],
        )
        self.assertTrue(entry["pricingAvailable"])
        self.assertEqual(entry["bookingLinks"], [{"name": "Book an appointment", "url": "https://pattedouce.example/rendez-vous"}])
        self.assertNotIn("80 $", json.dumps(entry))

    def test_redirected_directory_source_marks_existing_entry_for_pruning(self):
        entry = {
            "website": "https://business.example/",
            "sourcePages": ["https://localcanada.net/explore/business/"],
        }
        self.assertTrue(MODULE.enrichment_uses_blocked_source(entry))

    def test_source_url_drops_tracking_but_keeps_functional_query(self):
        value = "https://booking.example/start?name=Posh+Paws&utm_source=maps&fbclid=abc"
        self.assertEqual(MODULE.safe_url(value), "https://booking.example/start?name=Posh+Paws")


if __name__ == "__main__":
    unittest.main()
