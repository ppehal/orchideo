/**
 * BASIC_001 - Interakce na příspěvek
 *
 * Category definitions for trigger detail page.
 * All 64 combinations of fan count × posts per month × interactions per post.
 */

export const BASIC_001_INTRO = `Facebook chce, aby se k fanouškům dostával jen ten nejzajímavější obsah, který je všem šitý na míru. Právě proto používá interakce jako barometr relevance a zajímavosti obsahu. Z nastavení se každý příspěvek zobrazí jen malému procentu vašich fanoušků. Dobře fungující profil potřebuje správnou frekvenci příspěvků, aby ho algoritmus považoval za dostatečně zajímavý a příspěvky fanouškům ukazoval častěji. Čím více interakcí potom příspěvky dostávají, tím většímu množství fanoušků algoritmus příspěvky ukáže a tím lépe vám profil funguje. Interakce fungují jako palivo pro váš profil. A s větším množstvím dosahu je i více příležitostí pro dodatečné interakce - funguje to jako sněhová koule, kterou je třeba rozkutálet.`

export interface CategoryDimension {
  id: string
  label: string
  min?: number
  max?: number
}

// Fan count dimension
export const FAN_COUNT_DIMENSION: CategoryDimension[] = [
  { id: 'SMALL', label: 'do 2 000 fanoušků', max: 1999 },
  { id: 'MEDIUM_SMALL', label: '2 000 - 5 000 fanoušků', min: 2000, max: 4999 },
  { id: 'MEDIUM_LARGE', label: '5 000 - 50 000 fanoušků', min: 5000, max: 49999 },
  { id: 'LARGE', label: '50 000+ fanoušků', min: 50000 },
]

// Posts per month dimension
export const POSTS_PER_MONTH_DIMENSION: CategoryDimension[] = [
  { id: 'LOW', label: '0-4 příspěvky/měsíc', max: 4 },
  { id: 'MEDIUM', label: '5-10 příspěvků/měsíc', min: 5, max: 10 },
  { id: 'HIGH', label: '11-15 příspěvků/měsíc', min: 11, max: 15 },
  { id: 'VERY_HIGH', label: '16+ příspěvků/měsíc', min: 16 },
]

// Interactions per post dimension
export const INTERACTIONS_PER_POST_DIMENSION: CategoryDimension[] = [
  { id: 'VERY_LOW', label: '0-5 interakcí/příspěvek', max: 5 },
  { id: 'LOW', label: '6-20 interakcí/příspěvek', min: 6, max: 20 },
  { id: 'MEDIUM', label: '21-50 interakcí/příspěvek', min: 21, max: 50 },
  { id: 'HIGH', label: '51+ interakcí/příspěvek', min: 51 },
]

export const BASIC_001_DIMENSIONS = {
  fanCount: FAN_COUNT_DIMENSION,
  postsPerMonth: POSTS_PER_MONTH_DIMENSION,
  interactionsPerPost: INTERACTIONS_PER_POST_DIMENSION,
}

// 4 × 4 × 4 = 64 combinations
export const BASIC_001_RECOMMENDATIONS: Record<string, string> = {
  // SMALL (do 2000 fans) - LOW posts (0-4)
  SMALL_LOW_VERY_LOW:
    'Jste pěkný lenivec. Fanoušků můžete mít více, ale ne s touto frekvencí příspěvků, zkuste jich dělat alespoň 8 měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte také příliš málo a Vaše příspěvky se tak ukazují málo lidem, zkuste měsíčně zapromovat alespoň 2 zábavnější druhy příspěvků každý za 20 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_LOW_LOW:
    'Jste pěkný lenivec. Fanoušků můžete mít více, ale ne s touto frekvencí příspěvků, zkuste jich dělat alespoň 8 měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte na takový počet příspěvků tak akorát, ale mohlo by to být lepší, zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 20 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_LOW_MEDIUM:
    'Jste pěkný lenivec, ale pro dobrý obsah máte talent! Fanoušků můžete mít více, ale ne s touto frekvencí příspěvků, zkuste jich dělat alespoň 8 měsíčně a témata střídejte. Interakcí máte poměrně hodně, ale neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 20 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_LOW_HIGH:
    'Ačkoliv jste pěkný lenivec, tak jste obsahový bůh, víte, jak vaše fanoušky skutečně přitáhnout! Můžete jich mít více, ale ne s touto frekvencí příspěvků, zkuste jich dělat alespoň 8 měsíčně a střídejte témata. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 20 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // SMALL - MEDIUM posts (5-10)
  SMALL_MEDIUM_VERY_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. S jejich obsahem je to ale horší. Máte příliš málo interakcí a Vaše příspěvky se tak ukazují málo lidem. Střídejte více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Zkuste měsíčně zapromovat alespoň 2 nejzábavnější příspěvky každý za 30 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_MEDIUM_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Interakcí máte taky tak akorát, ale může to být ještě lepší, když mezi témata zařadíte i příspěvky, které ve vašem oboru pobaví. Zkuste také měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 30 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_MEDIUM_MEDIUM:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte ale pořád pomálu. Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 30 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_MEDIUM_HIGH:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte ale pořád pomálu. V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci, tak zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 30 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // SMALL - HIGH posts (11-15)
  SMALL_HIGH_VERY_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí i málo fanoušků. Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 30 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_HIGH_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků máte ale pořád pomálu. Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_HIGH_MEDIUM:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků máte ale pořád pomálu. Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_HIGH_HIGH:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků máte ale pořád pomálu. V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 30 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // SMALL - VERY_HIGH posts (16+)
  SMALL_VERY_HIGH_VERY_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí i málo fanoušků. Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 30 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_VERY_HIGH_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 30 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_VERY_HIGH_MEDIUM:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků máte pořád pomálu. Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  SMALL_VERY_HIGH_HIGH:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků máte ale pořád pomálu. V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 30 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // MEDIUM_SMALL (2000-5000 fans) - LOW posts (0-4)
  MEDIUM_SMALL_LOW_VERY_LOW:
    'Jste pěkný lenivec. Fanoušků už nemáte úplně málo, ale pořád je kam růst. Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte také příliš málo a Vaše příspěvky se tak ukazují málo lidem, zkuste měsíčně zapromovat alespoň 2 zábavnější druhy příspěvků každý za 30 dolarů a cílení nastavte jen na fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_LOW_LOW:
    'Jste pěkný lenivec. Fanoušků už nemáte úplně málo, ale pořád je kam růst. Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte na takový počet příspěvků tak akorát, ale mohlo by to být lepší, zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 30 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_LOW_MEDIUM:
    'Jste pěkný lenivec, ale pro dobrý obsah máte talent! Fanoušků už nemáte úplně málo, ale pořád je kam růst. Zkuste dělat alespoň 8 příspěvků měsíčně a témata střídejte. Interakcí máte poměrně hodně, ale neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_LOW_HIGH:
    'Ačkoliv jste pěkný lenivec, tak jste obsahový bůh, víte, jak vaše fanoušky skutečně přitáhnout! Můžete jich mít více, ale ne s touto frekvencí příspěvků, zkuste jich dělat alespoň 8 měsíčně a střídejte témata. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // MEDIUM_SMALL - MEDIUM posts (5-10)
  MEDIUM_SMALL_MEDIUM_VERY_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. S jejich obsahem je to ale horší. Máte příliš málo interakcí a Vaše příspěvky se tak ukazují málo lidem. Střídejte více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Zkuste měsíčně zapromovat alespoň 2 nejzábavnější příspěvky každý za 40 dolarů a cílení nastavte jen na fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_MEDIUM_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Interakcí máte taky tak akorát, ale může to být ještě lepší, když mezi témata zařadíte i příspěvky, které ve vašem oboru pobaví. Zkuste také měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 40 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_MEDIUM_MEDIUM:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte ale pořád pomálu. Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_MEDIUM_HIGH:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte ale pořád pomálu. V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci, tak zkuste měsíčně zapromovat alespoň 4 příspěvky s nejvíce interakcemi každý za 30 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // MEDIUM_SMALL - HIGH posts (11-15)
  MEDIUM_SMALL_HIGH_VERY_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí. Fanoušků už nemáte málo, ale mohlo by to být lepší. Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 2 příspěvky s nejvíce interakcemi každý za 40 dolarů a cílení nastavte jen na fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_HIGH_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků už nemáte málo, ale mohlo by to být lepší. Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_HIGH_MEDIUM:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků už nemáte málo, ale mohlo by to být lepší. Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 50 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_HIGH_HIGH:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků už nemáte málo, ale mohlo by to být lepší. V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // MEDIUM_SMALL - VERY_HIGH posts (16+)
  MEDIUM_SMALL_VERY_HIGH_VERY_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí. Fanoušků už nemáte málo, ale mohlo by to být lepší. Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 2 příspěvky s nejvíce interakcemi každý za 50 dolarů a cílení nastavte jen na fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_VERY_HIGH_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 40 dolarů. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_VERY_HIGH_MEDIUM:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků už nemáte málo, ale mohlo by to být lepší. Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 50 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',
  MEDIUM_SMALL_VERY_HIGH_HIGH:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků už nemáte málo, ale mohlo by to být lepší. V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 40 dolarů a snažte se cílit i mimo Vaše fanoušky. Zkuste také kampaně zaměřené na cíl zisku nových fanoušků. Nechte je běžet alespoň za 160 dolarů na měsíc.',

  // MEDIUM_LARGE (5000-50000 fans) - LOW posts (0-4)
  MEDIUM_LARGE_LOW_VERY_LOW:
    'Jste pěkný lenivec. Fanoušků už máte opravdu hodně, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte také příliš málo a Vaše příspěvky se tak ukazují málo lidem, zkuste měsíčně zapromovat alespoň 2 zábavnější druhy příspěvků každý za 70 dolarů a cílení nastavte jen na fanoušky.',
  MEDIUM_LARGE_LOW_LOW:
    'Jste pěkný lenivec. Fanoušků máte opravdu hodně, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte na takový počet příspěvků tak akorát, ale mohlo by to být lepší, zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 90 dolarů a zkuste cílit jen Vaše fanoušky.',
  MEDIUM_LARGE_LOW_MEDIUM:
    'Jste pěkný lenivec, ale pro dobrý obsah máte talent! Fanoušků máte opravdu hodně, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a témata střídejte. Interakcí máte poměrně hodně, ale neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 70 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',
  MEDIUM_LARGE_LOW_HIGH:
    'Ačkoliv jste pěkný lenivec, tak jste obsahový bůh, víte, jak vaše fanoušky skutečně přitáhnout! Fanoušků máte opravdu hodně, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',

  // MEDIUM_LARGE - MEDIUM posts (5-10)
  MEDIUM_LARGE_MEDIUM_VERY_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. S jejich obsahem je to ale horší. Máte příliš málo interakcí a Vaše příspěvky se tak ukazují málo lidem, přitom fanoušků máte kupu, tak toho pojďte využít! Střídejte více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Zkuste měsíčně zapromovat alespoň 2 nejzábavnější příspěvky každý za 80 dolarů a cílení nastavte jen na fanoušky.',
  MEDIUM_LARGE_MEDIUM_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte opravdu hodně, tak toho využijte! Interakcí máte taky tak akorát, ale může to být ještě lepší, když mezi témata zařadíte i příspěvky, které ve vašem oboru pobaví. Zkuste také měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 90 dolarů a zkuste cílit jen na Vaše fanoušky.',
  MEDIUM_LARGE_MEDIUM_MEDIUM:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte opravdu hodně, tak toho využijte! Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 70 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',
  MEDIUM_LARGE_MEDIUM_HIGH:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků máte opravdu hodně, tak toho využijte! V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci, tak zkuste měsíčně zapromovat alespoň 4 příspěvky s nejvíce interakcemi každý za 60 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',

  // MEDIUM_LARGE - HIGH posts (11-15)
  MEDIUM_LARGE_HIGH_VERY_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí. Fanoušků máte opravdu hodně, tak toho využijte! Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 2 příspěvky s nejvíce interakcemi každý za 80 dolarů a cílení nastavte jen na fanoušky.',
  MEDIUM_LARGE_HIGH_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků máte opravdu hodně, tak toho využijte! Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 70 dolarů a zkuste cílit jen na Vaše fanoušky.',
  MEDIUM_LARGE_HIGH_MEDIUM:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků máte opravdu hodně, tak toho využijte! Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',
  MEDIUM_LARGE_HIGH_HIGH:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků máte opravdu hodně, tak toho využijte! V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',

  // MEDIUM_LARGE - VERY_HIGH posts (16+)
  MEDIUM_LARGE_VERY_HIGH_VERY_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí. Fanoušků máte opravdu hodně, tak toho využijte! Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 2 příspěvky s nejvíce interakcemi každý za 80 dolarů a cílení nastavte jen na fanoušky.',
  MEDIUM_LARGE_VERY_HIGH_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 70 dolarů a zkuste cílit jen na Vaše fanoušky.',
  MEDIUM_LARGE_VERY_HIGH_MEDIUM:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků máte opravdu hodně, tak toho využijte! Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',
  MEDIUM_LARGE_VERY_HIGH_HIGH:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků máte opravdu hodně, tak toho využijte! V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jak Vaše fanoušky, tak mimo ně.',

  // LARGE (50000+ fans) - LOW posts (0-4)
  LARGE_LOW_VERY_LOW:
    'Jste pěkný lenivec. Fanoušků už máte více než dost, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte také příliš málo a Vaše příspěvky se tak ukazují málo lidem, zkuste měsíčně zapromovat alespoň 2 zábavnější druhy příspěvků každý za 80 dolarů a cílení nastavte jen na fanoušky.',
  LARGE_LOW_LOW:
    'Jste pěkný lenivec. Fanoušků už máte více než dost, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Určitě nezapomeňte na příspěvky, které ve vašem oboru pobaví. Interakcí máte na takový počet příspěvků tak akorát, ale mohlo by to být lepší, zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 90 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_LOW_MEDIUM:
    'Jste pěkný lenivec, ale pro dobrý obsah máte talent! Fanoušků už máte více než dost, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a témata střídejte. Interakcí máte poměrně hodně, ale neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 100 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_LOW_HIGH:
    'Ačkoliv jste pěkný lenivec, tak jste obsahový bůh, víte, jak vaše fanoušky skutečně přitáhnout! Fanoušků už máte více než dost, tak toho využijte! Zkuste dělat alespoň 8 příspěvků měsíčně a střídejte témata. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jen na Vaše fanoušky.',

  // LARGE - MEDIUM posts (5-10)
  LARGE_MEDIUM_VERY_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. S jejich obsahem je to ale horší. Máte příliš málo interakcí a Vaše příspěvky se tak ukazují málo lidem, přitom fanoušků máte více než dost, tak toho pojďte využít! Střídejte více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Zkuste měsíčně zapromovat alespoň 2 nejzábavnější příspěvky každý za 100 dolarů a cílení nastavte jen na fanoušky.',
  LARGE_MEDIUM_LOW:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků už máte více než dost, tak toho využijte! Interakcí máte taky tak akorát, ale může to být ještě lepší, když mezi témata zařadíte i příspěvky, které ve vašem oboru pobaví. Zkuste také měsíčně zapromovat alespoň 2 příspěvky s nejvíce interakcemi každý za 100 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_MEDIUM_MEDIUM:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků už máte více než dost, tak toho využijte! Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Zkuste měsíčně zapromovat alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_MEDIUM_HIGH:
    'Příspěvků děláte tak akorát, možná by to chtělo ještě trošku, ale určitě se bez nich svět nezboří. Fanoušků už máte více než dost, tak toho využijte! V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Interakcí máte kupu, tak toho pojďte využít, budete mít levnou propagaci, tak zkuste měsíčně zapromovat alespoň 4 příspěvky s nejvíce interakcemi každý za 80 dolarů a zkuste cílit jen na Vaše fanoušky.',

  // LARGE - HIGH posts (11-15)
  LARGE_HIGH_VERY_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí. Fanoušků už máte více než dost, tak toho využijte! Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a cílení nastavte jen na fanoušky.',
  LARGE_HIGH_LOW:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků už máte více než dost, tak toho využijte! Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 100 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_HIGH_MEDIUM:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků už máte více než dost, tak toho využijte! Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 120 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_HIGH_HIGH:
    'Příspěvků děláte možná až zbytečně moc, tak zkuste zvolnit, pokud by hrozilo, že Vám dojdou nápady. Fanoušků už máte více než dost, tak toho využijte! V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 100 dolarů a zkuste cílit jen na Vaše fanoušky.',

  // LARGE - VERY_HIGH posts (16+)
  LARGE_VERY_HIGH_VERY_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Raději se soustřeďte více na jejich kvalitu, protože máte velice málo interakcí. Fanoušků už máte více než dost, tak toho využijte! Zkuste více témat a nezapomeňte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 80 dolarů a cílení nastavte jen na fanoušky.',
  LARGE_VERY_HIGH_LOW:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Kvalitu obsahu máte v pořádku, i když by to mohlo být ještě lepší. Nezapomínejte na příspěvky, které ve vašem oboru pobaví. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 100 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_VERY_HIGH_MEDIUM:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků už máte více než dost, tak toho využijte! Pro dobrý obsah máte ale talent, protože máte kupu interakcí, tak neusněte na vavřínech. Pojďte toho využít, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy a zapromujte měsíčně alespoň 3 příspěvky s nejvíce interakcemi každý za 120 dolarů a zkuste cílit jen na Vaše fanoušky.',
  LARGE_VERY_HIGH_HIGH:
    'Příspěvků děláte příliš moc a nijak si tím nepomáháte, naopak Vás stojí zdroje na jejich výrobu. Navíc hrozí, že Vám dojdou nápady. Zvolněte na maximálně 10 příspěvků měsíčně. Fanoušků už máte více než dost, tak toho využijte! V každém případě jste ale obsahový bůh a i my se od Vás můžeme učit. Máte kupu interakcí, tak jich využijte, budete mít levnou propagaci. Co ušetříte v nákladech na tvorbě příspěvků dejte do placené reklamy. Zapromujte měsíčně alespoň 4 příspěvky s nejvíce interakcemi každý za 100 dolarů a zkuste cílit jen na Vaše fanoušky.',
}

/**
 * Determine fan count category
 */
function getFanCountCategory(fanCount: number): string {
  const cat = FAN_COUNT_DIMENSION.find(
    (d) => (d.min === undefined || fanCount >= d.min) && (d.max === undefined || fanCount <= d.max)
  )
  return cat?.id ?? 'SMALL'
}

/**
 * Determine posts per month category
 */
function getPostsCategory(postsPerMonth: number): string {
  const cat = POSTS_PER_MONTH_DIMENSION.find(
    (d) =>
      (d.min === undefined || postsPerMonth >= d.min) &&
      (d.max === undefined || postsPerMonth <= d.max)
  )
  return cat?.id ?? 'LOW'
}

/**
 * Determine interactions per post category
 */
function getInteractionsCategory(interactionsPerPost: number): string {
  const cat = INTERACTIONS_PER_POST_DIMENSION.find(
    (d) =>
      (d.min === undefined || interactionsPerPost >= d.min) &&
      (d.max === undefined || interactionsPerPost <= d.max)
  )
  return cat?.id ?? 'VERY_LOW'
}

/**
 * Get category key for BASIC_001 trigger
 *
 * @param fanCount - Number of page fans
 * @param postsPerMonth - Average posts per month
 * @param interactionsPerPost - Average interactions per post
 * @returns Category key like "SMALL_LOW_VERY_LOW"
 */
export function getCategoryKey(
  fanCount: number,
  postsPerMonth: number,
  interactionsPerPost: number
): string {
  const fanCat = getFanCountCategory(fanCount)
  const postCat = getPostsCategory(postsPerMonth)
  const intCat = getInteractionsCategory(interactionsPerPost)

  return `${fanCat}_${postCat}_${intCat}`
}

/**
 * Get recommendation text for a category key
 */
export function getRecommendation(categoryKey: string): string | undefined {
  return BASIC_001_RECOMMENDATIONS[categoryKey]
}
