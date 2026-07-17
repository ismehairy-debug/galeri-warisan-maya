3D MODELS
=========

Each folder is a Sketchfab glTF export (see its license.txt for the
author and CC terms). The three *_merged files were compacted offline:
node transforms baked into the vertices and all meshes merged into one
primitive per material (the grass patch alone was 9,437 separate meshes
= 9,437 draw calls before merging), and every texture over ~1 MB was
downscaled to 1024 px. Background-only models also had their normal /
metallic-roughness maps stripped -- invisible through the distance haze.

keris/            loaded by the KERIS & ANYAMAN station (replaces the photo)
cow_skin/         two lembu grazing near the sawah and the kereta lembu
patch_of_grass/   walk-through grass drifts by the sawah and the east field
low_poly_tree_scene_free/                 forest hillside, north-east quadrant
the_landscape_is_a_forest_in_the_mountains/  western backdrop beyond the sawah
mountain_range_01/                        northern horizon range behind the Istana

All loads fail soft (index.html's loadImportedModel): the procedural
kampung is complete without them.
