# Top Sports Partnerverwaltung

Interne Webapp zur zentralen Verwaltung und Suche von Firmenfitness- und Vereinsfitnesspartnern im Top-Sports-Fitness-Designsystem.

## Architektur

Die Oberfläche bleibt eine statische Webapp ohne Build-Schritt und wird über GitHub Pages ausgeliefert. Zentrale Datenhaltung und Anmeldung laufen über das Supabase-Projekt **ChallengeTSCan**.

- **Frontend:** HTML, CSS und JavaScript
- **Hosting:** GitHub Pages, Branch `main`, Repository-Root
- **Authentifizierung:** Supabase Auth
- **Datenbank:** Supabase Postgres
- **Autorisierung:** Row Level Security (RLS) + Rollen in `app_metadata`
- **Serverfunktionen:** Supabase Edge Functions für Ersteinrichtung und Benutzerverwaltung
- **Supabase Client:** fest auf `@supabase/supabase-js@2.102.0` gepinnt

Der Publishable Key liegt bewusst im Browsercode. Er besitzt keine administrativen Rechte; der tatsächliche Datenzugriff wird über Supabase Auth und RLS abgesichert. Secret-/Service-Role-Keys dürfen niemals im Frontend oder Repository abgelegt werden.

## Rollen

### Theke (`employee`)

- Übersicht, Firmenfitness und Vereinsfitness öffnen
- aktive Partner und freigegebene Konditionen sehen
- keine internen Ansprechpartner-, Telefon-, E-Mail-, Vertrags- oder Notizdaten abrufen
- keine Partnerdaten verändern

### Clubleiter (`clubManager`)

- alle Partnerstatus sehen
- Partner anlegen, bearbeiten, freigeben und löschen
- interne Kontaktdaten, Besonderheiten und Kooperationsvertragslinks sehen
- XLSX-Export nutzen

### Admin (`admin`)

- alle Rechte der Clubleitung
- Benutzerkonten anlegen und entfernen
- Rollen für neue Benutzer vergeben

Rollen werden serverseitig aus `auth.users.raw_app_meta_data` übernommen. `user_metadata` wird nicht für Autorisierungsentscheidungen verwendet.

## Datenmodell

### `public.partners`

Enthält die für normale angemeldete Nutzer freigabefähigen Partnerinformationen, darunter Name, Typ, Studio, Konditionen, Gebühren und Status.

### `public.partner_details`

Enthält interne Kooperationsdaten wie Ansprechpartner, Telefon, E-Mail, Vertragslink, Notizen und letzten Kontakt. RLS erlaubt den Zugriff ausschließlich Clubleitern und Admins.

### `public.profiles`

Spiegelt Benutzername, Anzeigename und Rolle der Supabase-Auth-Benutzer. Ein Benutzer sieht sein eigenes Profil; Admins sehen alle Profile.

### `public.bootstrap_config`

Enthält ausschließlich den Hash des einmaligen Setup-Codes. Nach erfolgreicher Ersteinrichtung wird der Bootstrap dauerhaft als verbraucht markiert.

## Anmeldung

Die App akzeptiert weiterhin kurze Benutzernamen. Intern werden diese auf nicht öffentliche technische Auth-E-Mail-Adressen unter `@challenge.topsports.fitness` abgebildet.

Supabase verwaltet Passwörter und Sessions. Im Browsercode und im Repository werden keine Benutzerpasswörter gespeichert.

## Ersteinrichtung

Die Ersteinrichtung wird genau einmal über `login.html?setup=1` durchgeführt.

1. Setup-Seite öffnen.
2. Den separat bereitgestellten einmaligen Setup-Code eingeben.
3. Ein Startpasswort mit mindestens 10 Zeichen festlegen und bestätigen.
4. Die App legt die Konten `theke`, `clubleiter` und `admin` in Supabase Auth an.
5. Der Setup-Code wird serverseitig als verbraucht markiert.
6. Anschließend erfolgt automatisch die Anmeldung als `admin`.

Der Setup-Code gehört nicht ins Repository, in Tickets oder in öffentliche Dokumentation.

## Partnerfunktionen

- Suche nach Partnern und Konditionen
- Studiofilter
- Firmenfitness- und Vereinsfitnessansichten
- rollenabhängige Partnerdetails
- Anlegen, Bearbeiten, Freigeben und Löschen für berechtigte Rollen
- OneDrive-Link zum Kooperationsvertrag
- XLSX-Export
- responsive Desktop- und Mobile-Darstellung
- Vorschlagsformular für Thekenmitarbeiter

## Supabase-Versionierung

Die angewendeten Datenbankmigrationen befinden sich unter `supabase/migrations/` und verwenden dieselben Versionsnummern wie das produktive Projekt.

Die Edge Functions liegen unter:

- `supabase/functions/bootstrap-users/`
- `supabase/functions/manage-users/`

Die Funktionseinstellungen stehen in `supabase/config.toml`.

## Sicherheit

- RLS ist auf allen über die Data API erreichbaren Anwendungstabellen aktiviert.
- Nicht angemeldete Nutzer erhalten keinen Partnerzugriff.
- Thekenkonten können interne Partnerdetails nicht über die API lesen.
- Nur Clubleiter und Admins dürfen Partner verändern.
- Nur Admins dürfen Benutzer über die `manage-users` Edge Function verwalten.
- Die Edge Function validiert die aktuelle Supabase-Sitzung und die Adminrolle serverseitig.
- Secret Keys bleiben ausschließlich in der Supabase-Serverumgebung.
- Das eigene Adminkonto kann über die Oberfläche nicht gelöscht werden.

## Deployment

GitHub Pages veröffentlicht den Inhalt von `main` aus dem Repository-Root. Änderungen werden zunächst auf einem Feature-Branch geprüft und anschließend über einen Pull Request nach `main` übernommen.
