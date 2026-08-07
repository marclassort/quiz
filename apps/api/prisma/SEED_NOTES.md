# Notes sur le seed napoléonien

Ce fichier documente, conformément à `claude.md` §10, les points sur lesquels
une relecture humaine est recommandée avant publication. Aucune question du
seed n'a été rédigée de mémoire seule : chaque fait a été vérifié par une
recherche web (Wikipédia FR, consulté le 07/08/2026) au moment de l'écriture
de `prisma/seed.ts`. Toutes les questions sont créées en `status = DRAFT`.

## Points à vérifier avant publication

### 1. Date exacte de fondation de la Banque de France

Deux pages consultées se contredisent sur le jour précis de fondation en
1800 : l'une indique le 18 janvier, l'autre le 13 février. L'année 1800 est
en revanche cohérente entre les deux sources. **La question du seed ne teste
que l'année**, pour rester sur un fait consensuel — mais si une question sur
la date exacte est ajoutée plus tard, vérifier d'abord l'acte de fondation
primaire (ou une source comme le site de la Banque de France elle-même).

### 2. Première abdication de Napoléon (avril 1814)

Deux abdications distinctes existent en avril 1814 : une abdication
conditionnelle le 4 avril (en faveur de son fils, rejetée par les Alliés),
puis l'abdication inconditionnelle le 6 avril. Le seed utilise le 6 avril
1814 comme « la » date de première abdication (c'est la date la plus
couramment citée comme référence), et la question ne teste que l'année pour
limiter le risque. À faire trancher par un relecteur si une question
day-level est envisagée.

### 3. Source unique : Wikipédia FR

Toutes les sources citées sont des pages Wikipédia en français. Une
tentative d'utiliser napoleon.org (Fondation Napoléon), une référence plus
spécialisée, a échoué avec une erreur HTTP 403 dans cet environnement de
travail. Recommandation : croiser ces informations avec une source
académique ou la Fondation Napoléon avant publication, en particulier pour
les questions à enjeu de précision (ex. le titre exact « Empereur des
Français »).

### 4. Cause du décès de Napoléon — sujet volontairement évité

Wikipédia FR signale que la cause du décès (cancer de l'estomac) fait
l'objet de controverses historiographiques (thèses d'empoisonnement). Aucune
question du seed n'aborde la cause du décès — seulement la date (5 mai 1821)
et le lieu (Sainte-Hélène), qui sont consensuels.

## Rappel

- 20 questions au total, réparties en 2 quiz (« Les grandes batailles
  napoléoniennes », « Institutions et dates clés de l'Empire »).
- Chaque question porte un champ `source` renseigné et un champ
  `explanation` contextualisant la réponse (§10).
- Rien n'est publié : tous les quiz sont créés avec `status = DRAFT`. La
  publication (passage à `PUBLISHED`) est un geste humain, via le
  back-office (lot 6g/6j), après relecture — y compris des points listés
  ci-dessus.
