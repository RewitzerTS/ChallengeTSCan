# Top Sports Partnerverwaltung

Interne Webapp zur Verwaltung und Suche von Firmenfitness- und Vereinsfitnesspartnern im Top-Sports-Fitness-Designsystem.

## 1. Kurze Designbeschreibung

Die Oberfläche nutzt eine dunkle Premium-Basis mit klarer weißer Typografie und gezielten roten Markenakzenten. Die App ist als effizientes internes Werkzeug für Mitarbeiter und Studioleitungen gestaltet: Sidebar auf Desktop, kompakte Bottom Navigation auf Mobile, ruhige Karten, klare Tabellen und ein fokussierter Detail-Drawer.

Das Logo wird aus der Top-Sports-Fitness-Website geladen. Falls die externe Quelle nicht verfügbar ist, bleibt ein definierter Markenbereich mit Text-Fallback sichtbar.

## 2. Seitenstruktur

- **Übersicht**: Kennzahlen, aktuelle Aufgaben, Schnellzugriff und vollständige Partnerliste.
- **Firmenfitness**: Gefilterte Suche und Übersicht aller Firmenpartner.
- **Vereinsfitness**: Gefilterte Suche und Übersicht aller Vereinspartner.
- **Verwaltung**: Admin-Formular zum Anlegen und Bearbeiten von Partnern plus Hinweise zur Rollenlogik.

## 3. Komponentenübersicht

- App Shell mit Sidebar, Topbar und mobiler Bottom Navigation
- Page Header mit Eyebrow, Titel, Beschreibung und maximal einer Hauptaktion
- KPI Cards
- Such- und Filterleiste mit Suchfeld, Chips und Studiofilter
- Desktop-Tabelle mit Status-Badges und Aktionen
- Mobile Kartenliste als Tabellenersatz
- Admin-Formular mit validierten Pflichtfeldern
- Detail-Drawer für Konditionen, Besonderheiten und Kontaktdaten
- Toast Feedback für Speichern und Löschen
- Rollenumschaltung Mitarbeiter / Clubleiter

## 4. Design Tokens

Die zentralen Tokens liegen in `styles.css` unter `:root`.

- Hauptfläche: `#080808`
- Sekundärfläche: `#101010`
- Kartenfläche: `#151515`
- Hover-Karte: `#1B1B1B`
- Divider: `rgba(255, 255, 255, 0.10)`
- Haupttext: `#F5F5F2`
- Sekundärtext: `#B8B8B2`
- Muted Text: `#7C7C76`
- Top-Sports-Rot: `#E30613`
- Rot Hover: `#C9000B`
- Rot Aktiv: `#A80009`
- Erfolg: `#2ECC71`
- Warnung: `#F2C94C`
- Fehler: `#EB5757`
- Info: `#56CCF2`
- Headline Font: `Montserrat`, fallback `Inter Tight`, `system-ui`
- Body Font: `Inter`, fallback `system-ui`
- Sidebar: `280px`
- Card Radius: `16px`
- Button/Input Radius: `10px`

## 5. Vollständiger Code

Die App besteht aus drei Dateien:

- `index.html`: Semantisches HTML, App Shell, Navigation, Listen, Formular, Drawer und SVG-Icon-Sprite.
- `styles.css`: Design Tokens, Komponenten, Zustände und responsive Breakpoints.
- `app.js`: Beispieldaten, Suche, Filter, Rollenlogik, CRUD-Funktionen und LocalStorage.

Die App kann direkt über `index.html` im Browser geöffnet werden. Es ist kein Build-Schritt erforderlich.

## 6. Hinweise zur Erweiterbarkeit

- Für eine produktive Version sollte `localStorage` durch eine API mit zentraler Datenbank ersetzt werden.
- Rollen sollten serverseitig geprüft werden. Der aktuelle Admin-Modus ist ein Frontend-Prototyp.
- Zusätzliche Studios können im Studiofilter und Formular-Select ergänzt werden.
- Weitere Statuswerte können in `statusBadge()` in `app.js` ergänzt werden.
- Für Import/Export wäre eine CSV-Funktion sinnvoll, damit bestehende Partnerdaten übernommen werden können.

## 7. Konsistente Umsetzung neuer Webapps

Neue interne Webapps sollten dieselbe App Shell, dieselben CSS Tokens und dieselben Komponentenklassen verwenden. Pro Seite gilt: eine klare Hauptaufgabe, eine eindeutige Hauptaktion, ruhige dunkle Flächen, rote Akzente nur für wichtige Zustände und Aktionen, deutsche Microcopy und responsive Tabellenersatz-Karten auf Mobile.
