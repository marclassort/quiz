import * as argon2 from 'argon2';
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnFrPackage from '@zxcvbn-ts/language-fr';
import { BadRequestException, Injectable } from '@nestjs/common';

const zxcvbn = new ZxcvbnFactory({
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnFrPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnFrPackage.translations,
});

/**
 * Seuil de score zxcvbn (0-4) en dessous duquel un mot de passe est refusé.
 * Sert de garde-fou contre les mots de passe faibles/communs (claude.md §5 :
 * "vérification contre une liste de mots de passe compromis, ex. zxcvbn pour
 * le score" — implémenté ici via le score plutôt que des règles de complexité
 * arbitraires, sans dépendance réseau tierce).
 */
const MINIMUM_STRENGTH_SCORE = 3;

@Injectable()
export class PasswordService {
  async hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, { type: argon2.argon2id });
  }

  async verify(passwordHash: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(passwordHash, plainPassword);
  }

  async assertStrongEnough(plainPassword: string, userInputs: string[] = []): Promise<void> {
    const result = await zxcvbn.checkAsync(plainPassword, userInputs);

    if (result.score < MINIMUM_STRENGTH_SCORE) {
      throw new BadRequestException(
        'Mot de passe trop faible ou trop commun. Choisissez un mot de passe plus robuste.',
      );
    }
  }
}
