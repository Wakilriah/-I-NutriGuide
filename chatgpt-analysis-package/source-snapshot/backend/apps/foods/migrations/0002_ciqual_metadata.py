from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("foods", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="foodcategory",
            name="name",
            field=models.CharField(max_length=150, unique=True),
        ),
        migrations.AlterField(
            model_name="food",
            name="name",
            field=models.CharField(max_length=255),
        ),
        migrations.AlterField(
            model_name="food",
            name="slug",
            field=models.SlugField(blank=True, max_length=220, unique=True),
        ),
        migrations.AddField(
            model_name="foodcategory",
            name="ciqual_group_code",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="foodcategory",
            name="ciqual_subgroup_code",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="foodcategory",
            name="ciqual_subsubgroup_code",
            field=models.CharField(blank=True, max_length=20),
        ),
        migrations.AddField(
            model_name="foodcategory",
            name="source",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="food",
            name="scientific_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="food",
            name="ciqual_code",
            field=models.CharField(blank=True, max_length=32, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="food",
            name="source",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="food",
            name="serving_size_g",
            field=models.DecimalField(decimal_places=3, default=100, max_digits=10),
        ),
        migrations.AddIndex(
            model_name="food",
            index=models.Index(fields=["ciqual_code"], name="foods_food_ciqual__1bd7a8_idx"),
        ),
        migrations.AddIndex(
            model_name="food",
            index=models.Index(fields=["source"], name="foods_food_source_6d0ea9_idx"),
        ),
        migrations.AddIndex(
            model_name="food",
            index=models.Index(fields=["category", "source"], name="foods_food_categor_fefb9b_idx"),
        ),
    ]
