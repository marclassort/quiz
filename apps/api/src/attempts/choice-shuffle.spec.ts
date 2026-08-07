import { shuffleForAttempt } from './choice-shuffle';

describe('shuffleForAttempt', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];

  it('produit le même ordre à chaque appel pour un même attemptId', () => {
    const first = shuffleForAttempt('attempt-1', items);
    const second = shuffleForAttempt('attempt-1', items);
    expect(first.map((i) => i.id)).toEqual(second.map((i) => i.id));
  });

  it("produit un ordre différent d'un attemptId à l'autre (au moins pour un des deux jeux de test)", () => {
    const forAttempt1 = shuffleForAttempt('attempt-1', items).map((i) => i.id);
    const forAttempt2 = shuffleForAttempt('attempt-2', items).map((i) => i.id);
    expect(forAttempt1).not.toEqual(forAttempt2);
  });

  it("ne mute pas le tableau d'origine", () => {
    const original = [...items];
    shuffleForAttempt('attempt-1', items);
    expect(items).toEqual(original);
  });

  it('conserve tous les éléments', () => {
    const shuffled = shuffleForAttempt('attempt-1', items);
    expect(shuffled.map((i) => i.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
});
