# Spec — Back-office d'administration

Le back-office est un outil de travail utilisé par des bénévoles, pas un CRUD généré. Il partage les tokens du site mais assume une densité d'information supérieure.

## Exigences

- **Une seule page pour créer une question**, sans navigation entre écrans : le type est choisi en haut, le formulaire se réorganise en conséquence, et un aperçu « comme un joueur » occupe un volet latéral permanent, synchronisé en direct.
- **Enregistrement automatique** du brouillon, indicateur d'état explicite, restauration après fermeture accidentelle.
- **Clavier d'abord** : passage au champ suivant sans souris, raccourci d'enregistrement, palette de commandes sur `Ctrl/Cmd+K` (rechercher un quiz, une question, lancer une action).
- **Liste de questions** : filtres reflétés dans l'URL — donc partageables et rechargeables —, recherche plein texte sur l'énoncé, tri par taux de réussite, sélection multiple avec actions groupées (publier, archiver, déplacer vers un autre quiz).
- **Aperçu de la normalisation** en direct sous le champ de réponse acceptée : l'admin voit la chaîne telle que le moteur la comparera et peut tester une saisie fictive.
- **File de modération** des réponses libres présentée comme une pile à traiter, acceptable ou refusable au clavier, et non comme un tableau à filtrer.
- **Éditeur cartographique** : sélection des features attendues directement sur la carte pour `MAP_CLICK` ; pose du point cible et visualisation du rayon de tolérance pour `MAP_PLACE`.
- Champs `explanation` et `source` obligatoires à la publication ; blocage de la publication d'un quiz contenant une question sans source.
- Import/export JSON d'un quiz complet.
- Journal des modifications — qui a modifié quoi, quand — sur les questions publiées.
- Messages d'erreur qui nomment le champ et l'action corrective ; écrans vides qui proposent l'action évidente.

## Mesure de succès

Créer une question à choix multiples complète (énoncé, 4 choix, explication, source) doit demander moins de manipulations qu'avant la refonte. Le nombre d'actions clavier/souris avant et après est mesuré et rapporté.
