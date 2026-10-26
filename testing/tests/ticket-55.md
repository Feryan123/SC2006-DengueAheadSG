<!--
- Lists the OneMap test cases.
- Records expected and actual results.
- Separates simulated tests from live checks.
-->
# Ticket #55: OneMap search test results

Owner: Romeo (P3)

Date: 26 October 2026 (Singapore)

Branch: `romeo/onemap-review`

Test file: [onemap-search.test.ts](../../dengue-ahead-sg/tests/onemap-search.test.ts).

The tests use fake OneMap responses and test login details. They do not contact
the real OneMap service.

| Test input or condition | Expected result | Actual result |
|---|---|---|
| Postal code `200640` with a matching address | 200 with address and coordinate strings | 200; one address; latitude and longitude remained strings |
| Address text with spaces and `&` | Correctly encoded query; only the fixed OneMap search URL is used | 200; trimmed text preserved; extra URL, page and token settings ignored |
| Postal code `000000` with no match | 200 with zero matches and an empty results list | 200; `found: 0`; `results: []` |
| Missing, empty or blank search text | 400; no OneMap request | 400 and zero requests in all 3 cases |
| POST instead of GET | 405; no OneMap request | 405; `Allow: GET`; zero requests |
| Email or password is missing | 503; no private details returned | 503; safe message; zero requests in both cases |
| Two searches with a valid cached token | Login once and reuse the token | One login and two searches using the same token |
| Token has 60 seconds left or is already expired | Get a new token before searching | 200; new token used in both cases |
| Expiry is supplied as a number instead of a string | Search succeeds | 200 |
| Invalid expiry or empty token | 503; do not search with an unusable token | 503; no search in all 5 cases |
| Search returns HTTP 401 with a non-JSON body | Get a new token and retry once | 200 after one renewal and one retry |
| Search returns an expired, invalid or missing-token error with HTTP 200 | Get a new token and retry once | 200 after one renewal and one retry in all 3 cases |
| New token is rejected too | 503; stop retrying and discard the rejected token | 503 after one retry; next request obtained a fresh token and returned 200 |
| Search returns an unrelated error | 503; no extra login and no private error details returned or logged | 503; safe message; one login; no error log |
| Login is rejected or its response is not JSON | 503 with a safe error message | 503 with the expected safe message in both cases |
| Search returns HTTP 500 or a non-JSON response | 503 with a safe error message | 503 with the expected safe message in both cases |
| Network failure or timeout | 503 with a safe error message | 503 with the expected safe message in both cases |
| Missing results, invalid counts or missing coordinates | 503 with a safe error message | 503 with the expected safe message in all 4 cases |
| Extra login or token fields in the search response | Return address details only | 200; address fields and pagination only |

## Check results

| Check | Result |
|---|---|
| `npm test -- --run` | 44 passed: 36 proxy tests and 8 existing risk-model tests |
| `npx tsc --noEmit` | Passed |
| `npm run build` | Passed |
| `git diff --check` | Passed |
| Private credentials in repository files or the frontend build | None found |

## Live OneMap checks

Checked on 26 October 2026 through the same handler in a temporary local Node.js
HTTP server. Real OneMap authentication and search endpoints were used. No
Vercel project or deployment was created.

| Check | Actual result |
|---|---|
| Valid postal code `200640` | 200; one address result |
| Invalid postal code `000000` | 200; zero matches; empty results list |
| Repeat searches with the cached token | Successful searches; no extra login |
| Deliberately invalid token on one search request | OneMap rejected it; the handler obtained a new token, retried once and returned 200 with one result |
| Login details or tokens in API responses | None found |
| Response caching | `Cache-Control: no-store` |

The live run made two authentication calls and five search calls. Credentials
were loaded privately from the Git-ignored local settings file. Their values
and the returned tokens were not printed or saved in this report.

Expiry timing and expired-token responses remain covered by the automated tests
using controlled time and fake responses. The live rejection check above used
an invalid token, not a naturally expired token.

P2 review, frontend integration and Vercel deployment are pending.
