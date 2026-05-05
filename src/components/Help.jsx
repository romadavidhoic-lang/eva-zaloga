import React, { useState } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, CheckCircle, RefreshCw, Package, Scissors, ShoppingCart } from 'lucide-react'

const SECTIONS = [
  {
    title: 'Vsakdanja uporaba',
    icon: CheckCircle,
    color: 'text-green-600',
    items: [
      {
        q: 'Kako dodam nov artikel v zalogo?',
        a: 'Pojdi na Zaloga → klikni "Nov artikel". Izberi tip: "Gotov izdelek" (kupljen že narejen) ali "Lastna produkcija" (šivaš iz blaga). Vnesi naziv, variante (velikost, barva, količina) in shrani.',
      },
      {
        q: 'Kako zabeležim nabavo blaga?',
        a: 'Pojdi na Nabava → "Nova nabava". Vnesi dobavitelja, datum, številko računa in vrstice (naziv, količina, cena). Aplikacija sešteje skupni znesek.',
      },
      {
        q: 'Kako oddam blago v šivalnico?',
        a: 'Pojdi na Produkcija → "Nova naloga" → izberi tip "Lastna produkcija". Izberi artikel, vnesi koliko metrov blaga oddaješ — aplikacija sama izračuna pričakovane kose po velikostih. Klikni "Oddaj v šivalnico". Blago se avtomatsko odšteje iz zaloge.',
      },
      {
        q: 'Ko prejmem kose iz šivalnice, kaj naredim?',
        a: 'Pojdi na Produkcija → poišči nalogo → klikni "Sprejmi iz šivalnice". Potrdi dejanske prejete kose po velikostih (predizpolnjeno po pričakovanju). Klikni "Potrdi prejem" — kosi se avtomatsko dodajo v zalogo končnih izdelkov.',
      },
      {
        q: 'Kako ročno odštejem zalogo za B2B naročilo?',
        a: 'Pojdi na Zaloga → klikni artikel → uredi varianто in zmanjšaj količino. Sprememba se zabeleži v changelog.',
      },
    ],
  },
  {
    title: 'Shopify in prodajni kanali',
    icon: ShoppingCart,
    color: 'text-blue-600',
    items: [
      {
        q: 'Ali se zaloga samodejno posodablja ko prodamo na Shopify?',
        a: 'Da, ko je Shopify integracija nastavljena. Shopify pošlje signal ob vsaki prodaji → aplikacija avtomatsko odšteje zalogo. Statns sinhronizacije je viden na Dashboardu.',
      },
      {
        q: 'Kaj pomenijo statusi kanalov na Dashboardu?',
        a: '"Aktiven" pomeni da je kanal konfiguriran in sinhroniziran. "Zadnji sync" prikazuje kdaj je bila zadnja uspešna sinhronizacija. Če je kanal "neaktiven", prodaje ne sinhronizirajo avtomatsko.',
      },
    ],
  },
  {
    title: 'Če gre kaj narobe',
    icon: AlertTriangle,
    color: 'text-orange-600',
    items: [
      {
        q: 'Aplikacija kaže rumeni "Offline" banner',
        a: 'Ni povezave z GitHubom (bodisi internet, bodisi GitHub je začasno nedosegljiv). Aplikacija prikazuje lokalne podatke — branje deluje, shranjevanje ne. Klikni "Poskusi znova". Počakaj par minut in poskusi znova. Vse spremembe ki jih boš naredila medtem ko si offline, se NE bodo shranile — počakaj da banner izgine.',
      },
      {
        q: 'Vidim rdeče obvestilo o napaki',
        a: 'Preberi sporočilo — pove točno kaj je šlo narobe. Najpogosteje: GitHub token je potekel (pojdi v Nastavitve in ga obnovi), ali pa je GitHub začasno nedosegljiv (počakaj in poskusi znova). Klikni X za zapreti obvestilo.',
      },
      {
        q: 'Zaloga kaže napačne številke',
        a: '1. Najprej preveri Changelog (Nastavitve → prihodnja funkcija) ali je bila sprememba zabeležena. 2. Pojdi v Nastavitve → Backup & Obnova → "Naloži seznam backupov". Izberi backup od danes ali včeraj. 3. Klikni "Obnovi" za povrnitev podatkov. 4. Javi Davidu z opisom kaj se je zgodilo.',
      },
      {
        q: 'Vidim opozorilo "Nedokončana operacija"',
        a: 'To pomeni da je aplikacija nehala delati med shranjevanjem (npr. prekinjena internetna povezava). Preveri zalogo in produkcijo ročno — poišči neskladje. Nato obnovi iz backupa (Nastavitve → Backup & Obnova) ali popravi ročno. Ko si prepričana da so podatki pravilni, klikni "Počisti opozorilo".',
      },
      {
        q: 'Pozabila sem PIN',
        a: 'Javi Davidu (Studio Elu). PIN se da ponastaviti direktno v nastavitvah brskalnika — brez dostopa do podatkov (podatki so na GitHubu, ne v brskalniku).',
      },
    ],
  },
  {
    title: 'Backup in varnost',
    icon: RefreshCw,
    color: 'text-purple-600',
    items: [
      {
        q: 'Kako pogosto se naredi backup?',
        a: 'Avtomatsko enkrat na dan, ob prvi shranitvi tistega dne. Shranjeni so zadnji 30 dni. Dodatno lahko kadarkoli klikneš "Prenesi backup zdaj" v Nastavitvah za takojšen lokalni izvoz.',
      },
      {
        q: 'Kje so moji podatki?',
        a: 'Vsi podatki so shranjeni v zasebnem GitHub repozitoriju (eva-zaloga). Do njega ima dostop samo David (Studio Elu) in ti. Aplikacija nima svojega strežnika — GitHub je baza podatkov.',
      },
      {
        q: 'Kaj je PIN in zakaj ga potrebujem?',
        a: 'PIN ščiti aplikacijo pred nepooblaščenim dostopom z istega brskalnika. Ker je GitHub token shranjen lokalno, bi brez PIN-a kdorkoli z dostopom do tvojega računalnika videl in urejal podatke. PIN se zahteva ob vsakem odprtju brskalnika.',
      },
    ],
  },
]

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 py-3 text-left text-sm font-medium text-gray-800 hover:text-brand-700"
      >
        {open ? <ChevronDown size={16} className="mt-0.5 flex-shrink-0 text-brand-500" /> : <ChevronRight size={16} className="mt-0.5 flex-shrink-0 text-gray-400" />}
        {q}
      </button>
      {open && (
        <p className="pl-7 pb-3 text-sm text-gray-600 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

export default function Help() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="card p-5 bg-brand-50 border-brand-200">
        <p className="text-sm text-brand-800">
          <strong>Kratka navodila za uporabo aplikacije.</strong> Klikni na vprašanje za odgovor.
          Če se pojavi problem ki ga tukaj ni — pokliči Davida (Studio Elu).
        </p>
      </div>

      {SECTIONS.map(({ title, icon: Icon, color, items }) => (
        <div key={title} className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50">
            <Icon size={16} className={color} />
            <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          </div>
          <div className="px-5">
            {items.map(item => <AccordionItem key={item.q} {...item} />)}
          </div>
        </div>
      ))}

      <div className="card p-5 text-center space-y-1">
        <p className="text-sm font-medium text-gray-700">Potrebuješ pomoč?</p>
        <p className="text-sm text-gray-500">David Hoič — Studio Elu</p>
        <a href="mailto:roma.david.hoic@gmail.com" className="text-sm text-brand-600 hover:underline">
          roma.david.hoic@gmail.com
        </a>
      </div>
    </div>
  )
}
