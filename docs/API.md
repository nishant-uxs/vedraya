# API — Consent & Regulatory (v1)

Base: `/api/v1`

## Consents

| Method | Path | Permission |
|---|---|---|
| GET | `/consents` | `consent:view` |
| GET | `/consents/kpis` | `consent:view` |
| GET | `/consents/versions` | `consent:view` |
| POST | `/consents/versions` | `consent:create` |
| GET | `/consents/:id` | `consent:view` |
| POST | `/consents` | `consent:create` |
| PATCH | `/consents/:id/status` | `consent:update` (+ `consent:withdraw` for withdrawn) |
| POST | `/consents/:id/withdraw` | `consent:withdraw` |

Status machine: `pending → obtained|withdrawn|expired`; `obtained → withdrawn|expired`.

## Regulatory

| Method | Path | Permission |
|---|---|---|
| GET | `/regulatory/ethics-committees` | `regulatory:view` |
| POST | `/regulatory/ethics-committees` | `regulatory:manage` |
| PATCH | `/regulatory/ethics-committees/:id` | `regulatory:manage` |
| GET | `/regulatory/ethics-committees/:id` | `regulatory:view` |
| GET | `/regulatory/kpis` | `regulatory:view` |
| GET | `/regulatory/submissions` | `regulatory:view` |
| GET | `/regulatory/submissions/:id` | `regulatory:view` |
| POST | `/regulatory/submissions` | `regulatory:manage` |
| PATCH | `/regulatory/submissions/:id/status` | `regulatory:manage` |
| PATCH | `/regulatory/submissions/:id/ctri` | `regulatory:manage` |

Status machine: `draft → submitted → under_review → approved|rejected|registered → expired`.

**CTRI TRACKING** endpoint updates kind=CTRI records only. There is **no** external CTRI integration.
