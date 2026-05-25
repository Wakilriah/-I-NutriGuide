from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("supplements", "0003_supplementfactsheet_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="SupplementAlias",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("alias", models.CharField(max_length=180)),
                ("slug", models.SlugField(max_length=200)),
                ("source", models.CharField(blank=True, max_length=80)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "supplement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="aliases",
                        to="supplements.supplement",
                    ),
                ),
            ],
            options={
                "ordering": ["alias"],
            },
        ),
        migrations.CreateModel(
            name="SupplementSafetyRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "rule_type",
                    models.CharField(
                        choices=[
                            ("absorption", "Absorption"),
                            ("drug_interaction", "Drug interaction"),
                            ("condition_caution", "Condition caution"),
                            ("pregnancy_caution", "Pregnancy caution"),
                            ("upper_limit", "Upper limit"),
                            ("side_effect", "Side effect"),
                        ],
                        max_length=40,
                    ),
                ),
                ("interacting_entity", models.CharField(blank=True, max_length=180)),
                (
                    "severity",
                    models.CharField(
                        choices=[
                            ("info", "Info"),
                            ("caution", "Caution"),
                            ("warning", "Warning"),
                        ],
                        default="caution",
                        max_length=20,
                    ),
                ),
                ("title", models.CharField(max_length=220)),
                ("description", models.TextField()),
                ("recommendation", models.TextField(blank=True)),
                ("source", models.CharField(blank=True, max_length=80)),
                ("source_url", models.URLField(blank=True, max_length=500)),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "supplement",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="safety_rules",
                        to="supplements.supplement",
                    ),
                ),
            ],
            options={
                "ordering": ["supplement__name", "severity", "rule_type", "title"],
            },
        ),
        migrations.AddIndex(
            model_name="supplementalias",
            index=models.Index(fields=["slug"], name="supp_alias_slug_idx"),
        ),
        migrations.AddIndex(
            model_name="supplementalias",
            index=models.Index(fields=["active"], name="supp_alias_active_idx"),
        ),
        migrations.AddConstraint(
            model_name="supplementalias",
            constraint=models.UniqueConstraint(
                fields=("supplement", "slug"), name="unique_alias_per_supplement"
            ),
        ),
        migrations.AddIndex(
            model_name="supplementsafetyrule",
            index=models.Index(fields=["rule_type"], name="supp_safety_type_idx"),
        ),
        migrations.AddIndex(
            model_name="supplementsafetyrule",
            index=models.Index(fields=["severity"], name="supp_safety_severity_idx"),
        ),
        migrations.AddIndex(
            model_name="supplementsafetyrule",
            index=models.Index(fields=["active"], name="supp_safety_active_idx"),
        ),
        migrations.AddConstraint(
            model_name="supplementsafetyrule",
            constraint=models.UniqueConstraint(
                fields=("supplement", "rule_type", "interacting_entity", "title"),
                name="unique_supplement_safety_rule",
            ),
        ),
    ]
