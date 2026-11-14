# Design "Hallenlicht" – before/after

Binding: [`docs/DESIGN.md`](../DESIGN.md). Inventory and rebuild plan: [`inventory.md`](inventory.md),
review: [`review.md`](review.md), task analysis: [`task-analysis.md`](task-analysis.md).

Screenshots are generated with `SCREENS_OUT=../docs/design/after pnpm --filter @ult/e2e screens` (demo data, 10 Nov 2026 12:00).

## Alarm screen (Android, Roborazzi)

| Before                              | After                              | After, font size 130 %               | Confirmation                         |
| ----------------------------------- | ---------------------------------- | ------------------------------------ | ------------------------------------ |
| ![](before/android/alarm_light.png) | ![](after/android/alarm_light.png) | ![](after/android/alarm_font130.png) | ![](after/android/alarm_confirm.png) |

## Overview (Pixel 7, light → dark)

| Screen                          | Before                                                                   | After light                                                             | After dark                                                             |
| ------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| In-App-Abfrage                  | <img src="before/pixel7-light/01-in-app-abfrage.jpg" width="180">        | <img src="after/pixel7-light/01-in-app-abfrage.jpg" width="180">        | <img src="after/pixel7-dark/01-in-app-abfrage.jpg" width="180">        |
| Start                           | <img src="before/pixel7-light/02-start.jpg" width="180">                 | <img src="after/pixel7-light/02-start.jpg" width="180">                 | <img src="after/pixel7-dark/02-start.jpg" width="180">                 |
| Offen                           | <img src="before/pixel7-light/03-offen.jpg" width="180">                 | <img src="after/pixel7-light/03-offen.jpg" width="180">                 | <img src="after/pixel7-dark/03-offen.jpg" width="180">                 |
| + Neu                           | <img src="before/pixel7-light/04-neu.jpg" width="180">                   | <img src="after/pixel7-light/04-neu.jpg" width="180">                   | <img src="after/pixel7-dark/04-neu.jpg" width="180">                   |
| + Neu (Serie)                   | <img src="before/pixel7-light/04b-neu-serie.jpg" width="180">            | <img src="after/pixel7-light/04b-neu-serie.jpg" width="180">            | <img src="after/pixel7-dark/04b-neu-serie.jpg" width="180">            |
| Kalender                        | <img src="before/pixel7-light/05-kalender.jpg" width="180">              | <img src="after/pixel7-light/05-kalender.jpg" width="180">              | <img src="after/pixel7-dark/05-kalender.jpg" width="180">              |
| Termine                         | <img src="before/pixel7-light/06-termine.jpg" width="180">               | <img src="after/pixel7-light/06-termine.jpg" width="180">               | <img src="after/pixel7-dark/06-termine.jpg" width="180">               |
| Termin bearbeiten               | <img src="before/pixel7-light/06b-termin-bearbeiten.jpg" width="180">    | <img src="after/pixel7-light/06b-termin-bearbeiten.jpg" width="180">    | <img src="after/pixel7-dark/06b-termin-bearbeiten.jpg" width="180">    |
| Serientermin ändern             | <img src="before/pixel7-light/06c-serientermin-aendern.jpg" width="180"> | <img src="after/pixel7-light/06c-serientermin-aendern.jpg" width="180"> | <img src="after/pixel7-dark/06c-serientermin-aendern.jpg" width="180"> |
| Trainings                       | <img src="before/pixel7-light/06d-trainings.jpg" width="180">            | <img src="after/pixel7-light/06d-trainings.jpg" width="180">            | <img src="after/pixel7-dark/06d-trainings.jpg" width="180">            |
| Ausfälle                        | <img src="before/pixel7-light/06e-ausfaelle.jpg" width="180">            | <img src="after/pixel7-light/06e-ausfaelle.jpg" width="180">            | <img src="after/pixel7-dark/06e-ausfaelle.jpg" width="180">            |
| Geräte                          | <img src="before/pixel7-light/07-geraete.jpg" width="180">               | <img src="after/pixel7-light/07-geraete.jpg" width="180">               | <img src="after/pixel7-dark/07-geraete.jpg" width="180">               |
| Gerät koppeln                   | <img src="before/pixel7-light/07b-geraete-koppeln.jpg" width="180">      | <img src="after/pixel7-light/07b-geraete-koppeln.jpg" width="180">      | <img src="after/pixel7-dark/07b-geraete-koppeln.jpg" width="180">      |
| Export                          | <img src="before/pixel7-light/08-export.jpg" width="180">                | <img src="after/pixel7-light/08-export.jpg" width="180">                | <img src="after/pixel7-dark/08-export.jpg" width="180">                |
| Einstellungen                   | <img src="before/pixel7-light/09-einstellungen.jpg" width="180">         | <img src="after/pixel7-light/09-einstellungen.jpg" width="180">         | <img src="after/pixel7-dark/09-einstellungen.jpg" width="180">         |
| Alarm-Einrichtung (Web-Hinweis) | <img src="before/pixel7-light/10-alarm-einrichtung.jpg" width="180">     | <img src="after/pixel7-light/10-alarm-einrichtung.jpg" width="180">     | <img src="after/pixel7-dark/10-alarm-einrichtung.jpg" width="180">     |
| Login                           | <img src="before/pixel7-light/12-login.jpg" width="180">                 | <img src="after/pixel7-light/12-login.jpg" width="180">                 | <img src="after/pixel7-dark/12-login.jpg" width="180">                 |
| Koppeln                         | <img src="before/pixel7-light/12b-koppeln.jpg" width="180">              | <img src="after/pixel7-light/12b-koppeln.jpg" width="180">              | <img src="after/pixel7-dark/12b-koppeln.jpg" width="180">              |
| Über                            | <img src="before/pixel7-light/13-ueber.jpg" width="180">                 | <img src="after/pixel7-light/13-ueber.jpg" width="180">                 | <img src="after/pixel7-dark/13-ueber.jpg" width="180">                 |

## Desktop (1280 × 800)

| Screen                          | Before                                                                    | After light                                                              | After dark                                                              |
| ------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| In-App-Abfrage                  | <img src="before/desktop-light/01-in-app-abfrage.jpg" width="260">        | <img src="after/desktop-light/01-in-app-abfrage.jpg" width="260">        | <img src="after/desktop-dark/01-in-app-abfrage.jpg" width="260">        |
| Start                           | <img src="before/desktop-light/02-start.jpg" width="260">                 | <img src="after/desktop-light/02-start.jpg" width="260">                 | <img src="after/desktop-dark/02-start.jpg" width="260">                 |
| Offen                           | <img src="before/desktop-light/03-offen.jpg" width="260">                 | <img src="after/desktop-light/03-offen.jpg" width="260">                 | <img src="after/desktop-dark/03-offen.jpg" width="260">                 |
| + Neu                           | <img src="before/desktop-light/04-neu.jpg" width="260">                   | <img src="after/desktop-light/04-neu.jpg" width="260">                   | <img src="after/desktop-dark/04-neu.jpg" width="260">                   |
| + Neu (Serie)                   | <img src="before/desktop-light/04b-neu-serie.jpg" width="260">            | <img src="after/desktop-light/04b-neu-serie.jpg" width="260">            | <img src="after/desktop-dark/04b-neu-serie.jpg" width="260">            |
| Kalender                        | <img src="before/desktop-light/05-kalender.jpg" width="260">              | <img src="after/desktop-light/05-kalender.jpg" width="260">              | <img src="after/desktop-dark/05-kalender.jpg" width="260">              |
| Termine                         | <img src="before/desktop-light/06-termine.jpg" width="260">               | <img src="after/desktop-light/06-termine.jpg" width="260">               | <img src="after/desktop-dark/06-termine.jpg" width="260">               |
| Termin bearbeiten               | <img src="before/desktop-light/06b-termin-bearbeiten.jpg" width="260">    | <img src="after/desktop-light/06b-termin-bearbeiten.jpg" width="260">    | <img src="after/desktop-dark/06b-termin-bearbeiten.jpg" width="260">    |
| Serientermin ändern             | <img src="before/desktop-light/06c-serientermin-aendern.jpg" width="260"> | <img src="after/desktop-light/06c-serientermin-aendern.jpg" width="260"> | <img src="after/desktop-dark/06c-serientermin-aendern.jpg" width="260"> |
| Trainings                       | <img src="before/desktop-light/06d-trainings.jpg" width="260">            | <img src="after/desktop-light/06d-trainings.jpg" width="260">            | <img src="after/desktop-dark/06d-trainings.jpg" width="260">            |
| Ausfälle                        | <img src="before/desktop-light/06e-ausfaelle.jpg" width="260">            | <img src="after/desktop-light/06e-ausfaelle.jpg" width="260">            | <img src="after/desktop-dark/06e-ausfaelle.jpg" width="260">            |
| Geräte                          | <img src="before/desktop-light/07-geraete.jpg" width="260">               | <img src="after/desktop-light/07-geraete.jpg" width="260">               | <img src="after/desktop-dark/07-geraete.jpg" width="260">               |
| Gerät koppeln                   | <img src="before/desktop-light/07b-geraete-koppeln.jpg" width="260">      | <img src="after/desktop-light/07b-geraete-koppeln.jpg" width="260">      | <img src="after/desktop-dark/07b-geraete-koppeln.jpg" width="260">      |
| Export                          | <img src="before/desktop-light/08-export.jpg" width="260">                | <img src="after/desktop-light/08-export.jpg" width="260">                | <img src="after/desktop-dark/08-export.jpg" width="260">                |
| Einstellungen                   | <img src="before/desktop-light/09-einstellungen.jpg" width="260">         | <img src="after/desktop-light/09-einstellungen.jpg" width="260">         | <img src="after/desktop-dark/09-einstellungen.jpg" width="260">         |
| Alarm-Einrichtung (Web-Hinweis) | <img src="before/desktop-light/10-alarm-einrichtung.jpg" width="260">     | <img src="after/desktop-light/10-alarm-einrichtung.jpg" width="260">     | <img src="after/desktop-dark/10-alarm-einrichtung.jpg" width="260">     |
| Login                           | <img src="before/desktop-light/12-login.jpg" width="260">                 | <img src="after/desktop-light/12-login.jpg" width="260">                 | <img src="after/desktop-dark/12-login.jpg" width="260">                 |
| Koppeln                         | <img src="before/desktop-light/12b-koppeln.jpg" width="260">              | <img src="after/desktop-light/12b-koppeln.jpg" width="260">              | <img src="after/desktop-dark/12b-koppeln.jpg" width="260">              |
| Über                            | <img src="before/desktop-light/13-ueber.jpg" width="260">                 | <img src="after/desktop-light/13-ueber.jpg" width="260">                 | <img src="after/desktop-dark/13-ueber.jpg" width="260">                 |

## All variants

Each screen is available in `before/<variant>/` and `after/<variant>/`; variants: `pixel7-light`, `pixel7-dark`, `iphone15-light`, `iphone15-dark`, `desktop-light`, `desktop-dark`.
