# Předání k objednání

## Co se v téhle oblasti děje

Položky se z výroby a přípravy **předávají k objednání**. Tím vznikají úkoly pro navazující útvary.
Kam úkol půjde, nerozhoduje ten, kdo položku předal, ale **příznaky na samotné položce**. Nákup
dostane úkol na položky, které se nakupují; VKM dostane úkol jen na položky, které jsou jako VKM
označené příznakem **`jevkm`**.

Z toho plyne celý tvar téhle domény: **úkol chybí nejčastěji proto, že příznak akci nespouštěl**,
ne proto, že by se předání nestalo nebo že by selhala integrace. Předání proběhlo, položky tam jsou,
jen mají `jevkm=0`.

## Kde je to zapsané

Evidence předaných položek je ve view **`ECv_AI_PolozkyKObjednani`**. Jeden řádek je jedna položka
předaná k objednání a nese vedle identifikace i příznaky, které rozhodly o směrování — mimo jiné
`jevkm`. Ke každému dotazu tedy potřebuješ tři věci: **den předání**, **zakázku** (`cisloZakazky`)
a **odesílatele**, tedy toho, kdo položky předal.

Čti to nástrojem, jehož jméno končí na **`polozky_k_objednani`** (klíč nese zdrojový prefix a nasazovací
příponu, proto poznávej podle konce, ne podle přesného řetězce). Vrací i pole `souhrn` s rozpadem
`{celkem, vkm, bez_vkm}`, takže poměr nemusíš počítat z výpisu. Nikdy si nedopisuj vlastní SQL nad
syrovými tabulkami — směrovací logika je v příznacích na tomhle view a jinde ji nedohledáš.

Parametr `je_vkm` **nech prázdný**. Je tam pro cílené výpisy, ne pro vyšetřování; viz krok 2 níže.

## Postup

1. **Z dotazu vytáhni den, zakázku a odesílatele.** Když některý chybí, zeptej se; bez nich dostaneš
   buď prázdno, nebo cizí data. Pozor na hranice dne — „17.8." znamená celý den, ne okamžik.
2. **Vytáhni všechny položky předané ten den** pro tu zakázku a odesílatele. **Bez filtru na
   `jevkm`.** Zkoumaný příznak se nefiltruje, jinak nerozeznáš „žádná položka nebyla VKM" od „nic se
   ten den nepředalo".
3. **Přečti hodnoty `jevkm`** na vrácených řádcích. Tohle je rozhodující důkaz.
4. **Rozhodni mezi dvěma příčinami:**
   - všechny řádky `jevkm=0` → úkol do VKM vzniknout neměl, systém se zachoval správně a odpověď je
     o nastavení položek;
   - alespoň jeden řádek `jevkm=1` a úkol přesto nevznikl → tohle je chyba a patří dál, ne k vysvětlení;
   - žádné řádky → ten den se pro tu kombinaci nepředávalo nic. Napřed ale ověř filtr podle kroku 1,
     teprve pak z toho dělej závěr.
5. **Vypiš kandidátní množinu** — předané položky s hodnotami `jevkm` — a k ní závěr. Tazatel si to
   ověří sám a zároveň uvidí, u kterých položek se má příznak opravit.

## Modelový případ

Tvar je závazný, čísla ne. Nikdy je nepřebírej jako zjištění.

> **Dotaz:** Nepřišel úkol do VKM na objednání materiálu. Proč 17.8.2026 přišel úkol jenom na nákup
> a ne na VKM? Šlo o zakázku 81929, odesílatel MWE.

Vytáhneš položky předané k objednání 17.8.2026 pro zakázku 81929 od odesílatele MWE, bez filtru na
`jevkm`. Dostaneš tři řádky, všechny s `jevkm=0`.

Odpověď pak zní: úkol do VKM nevznikl proto, že žádná z položek předaných ten den nebyla označená
jako VKM — všechny tři mají `jevkm=0`, takže se založil pouze úkol na nákup. Systém se zachoval podle
nastavení; opravit se to má na příznaku položek, ne v integraci. Následuje výpis těch tří řádků
s hodnotami příznaku.

Čeho si všimni: odpověď netvrdí, že se předání nestalo, ani že něco selhalo. Kdyby mezi řádky byl
jeden s `jevkm=1`, byl by závěr opačný — a byla by to chyba, ne vysvětlení.

## Co tahle evidence neříká

`ECv_AI_PolozkyKObjednani` zachycuje **stranu předání** — co bylo předáno a s jakými příznaky.
Neříká, jestli navazující úkol skutečně vznikl.

Prakticky to znamená, že první příčinu (`jevkm=0`, úkol vzniknout neměl) doložíš z tohohle view
úplně. Druhou příčinu (`jevkm=1`, a přesto nic) z něj **doložit nejde** — vidíš jen to, že vzniknout
měl. Když na tenhle případ narazíš, řekni to naplno: příznak akci spouštěl, takže tady evidence
předání končí a je potřeba se podívat na stranu zakládání úkolů. Nedomýšlej si, co se stalo dál.
