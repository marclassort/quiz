# Backlog — Mode championnat (PARQUÉ, ne pas implémenter)

> Ce document est une note de conception pour plus tard. Aucun lot en cours ne le concerne.
> Ne pas créer de table, d'endpoint ni de composant pour ce mode. Ne pas le lire dans une session
> de travail portant sur autre chose.

## Décision actuelle

Pas de multi-joueurs, pas de buzzer réseau, pas de WebSocket. Si le mode est ouvert un jour, il commencera par une version **solo contre un adversaire simulé**, sans temps réel partagé.

## Format envisagé

Trois manches, identité entièrement originale (aucun nom, habillage ou son d'une émission existante) :

1. **Manche à indices** : une question est révélée par paliers, du plus vague au plus précis. Répondre tôt rapporte davantage ; une erreur exclut de la question en cours. Suppose un type de question `PROGRESSIVE_CLUE` avec un payload `{ clues: string[] (2 à 6), revealIntervalMs }`, les indices étant servis un par un par l'API.
2. **Série thématique** : choix d'un thème puis N questions courtes en temps limité, bonus à la série complète.
3. **Face-à-face** : progression sur une grille, chaque bonne réponse fait avancer, chaque erreur fait avancer l'adversaire.

## Contraintes techniques à respecter le jour venu

- Horloge et horodatage de référence côté serveur ; journal d'événements horodaté comme source de vérité.
- Le client ne reçoit jamais l'indice suivant avant son échéance.
- Déroulé piloté par une machine à états testable, indépendante de l'UI.
- Classement séparé du classement principal.
- Le multi-joueurs temps réel ajoute matchmaking, reconnexion, abandon et anti-abus : autant de chantiers distincts, à ne lancer qu'avec un usage identifié.
- Règles complètes à rédiger dans `docs/CHAMPIONSHIP_RULES.md` **avant** toute ligne de code.
