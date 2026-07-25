/* ── entity-map.js — central MusicBrainz ID → internal path mapping ── */
/* Used by contributor.js to generate internal links for artists and places. */
/* All paths use ../../ prefix (relative to /archive/by-contributor/[name]/) */

window.__ENTITY_MAP = {

    /* ── Artists → /archive/by-artist/ ── */

    /* juanito thompson */
    'ddcbeb01-edb5-4e74-b5cd-23d1b64d3086': '../../by-artist/juanito-thompson/',

    /* bottle boys collective (+ NMSB alias) */
    'e33d1006-01a5-4266-aade-b7f6c1dff8e3': '../../by-artist/bottle-boys-collective/',
    'dc2aa366-6f44-48dd-b1f9-a9aa705a6452': '../../by-artist/bottle-boys-collective/',

    /* thld — texas hold'em lava dome (+ tornado massacre, ocean i miss you) */
    '4d945923-9deb-4cd0-a477-6e1474cb306c': '../../by-artist/thld/',
    'e1e53b08-af12-4d5a-8508-c620d5279ba3': '../../by-artist/thld/',
    '30d9cd20-3f5c-4a83-b13b-58ba8c690e2e': '../../by-artist/thld/',

    /* svfp */
    '260e4953-a937-4355-8389-d1baaf24eca5': '../../by-artist/svfp/',

    /* c.p. rutledge */
    '44c1e0bd-be4c-4a0b-8f06-864c8e2fedcc': '../../by-artist/c-p-rutledge/',

    /* jon mccoy */
    '33c830f0-d5be-4baf-b8db-3dc754e74c16': '../../by-artist/jon-mccoy/',

    /* dino spumoni */
    '5b954c0a-1375-40de-ae5f-a245e4f942c6': '../../by-artist/dino-spumoni/',

    /* ddt llc */
    '0335c576-94a4-4adb-a323-6effff5914e0': '../../by-artist/ddt-llc/',

    /* the four b's */
    'bdf6e0d0-6886-4801-b7ce-c9ced5d377a8': '../../by-artist/four-bs/',

    /* dag henderson */
    '605cc914-2aff-4e2b-9657-524c7009cb18': '../../by-artist/dag-henderson/',

    /* vinny bobarino (+ bears crossing alias) */
    'f701c2bc-6eb6-4e7b-b950-f0c2426cb91c': '../../by-artist/vinny-bobarino/',
    '856f7f94-8c21-49cb-9364-e1f7b429f9ef': '../../by-artist/vinny-bobarino/',
    '246bff13-d203-4879-a22b-9ad6b5ddae7c': '../../by-artist/vinny-bobarino/',
    'd9179190-dcf2-469e-b4c8-3624b97dc11a': '../../by-artist/vinny-bobarino/',

    /* audio sound paper, et al. (+ member aliases) */
    '76708e20-5d88-4699-adf6-a1f2118ef661': '../../by-artist/audio-sound-paper-et-al/',
    '0296c377-7f97-4099-9c83-e2edb5552eda': '../../by-artist/audio-sound-paper-et-al/',
    '5c860d63-acfa-4584-82db-4a76339b2f1e': '../../by-artist/audio-sound-paper-et-al/',
    '8b11928f-4013-4ac9-a39b-826bbc01b25c': '../../by-artist/audio-sound-paper-et-al/',

    /* woah */
    '0cb54a5f-3c60-4635-abb3-e6bc60fa7d9f': '../../by-artist/woah/',

    /* fruity loops debauchery collective (+ member aliases) */
    'b7846e25-306e-4ca9-8db1-0391ab159a36': '../../by-artist/fruity-loops-debauchery-collective/',
    'ce22522c-1193-4298-badf-0df5cdfa0415': '../../by-artist/fruity-loops-debauchery-collective/',
    '3c3bc6e8-9d72-457f-a192-b6ef263fe4ae': '../../by-artist/fruity-loops-debauchery-collective/',

    /* jake mccoy — no by-artist page, maps to by-contributor */
    '32bc1ac7-efd0-44f2-8645-8fecf6a40edb': '../../by-contributor/jake-mccoy/',

    /* rho k. — no by-artist page, maps to by-contributor */
    'b0d4d4fd-d500-4439-b401-5c15f231e41f': '../../by-contributor/rho-k/',

    /* alex s. — no by-artist page, maps to by-contributor */
    '0bfa85f1-5138-4790-8439-e709399944df': '../../by-contributor/alex-s/',

    /* chuck j'ob — no by-artist page, maps to by-contributor */
    'c8ba82bf-cfa1-49a0-98bf-0cf8f931099f': '../../by-contributor/chuck-job/',

    /* jake thomas — no by-artist page, maps to by-contributor */
    'a492cd5d-b090-48e3-8bbb-0f8f5cefc34a': '../../by-contributor/jake-thomas/',

    /* ellis grey — no by-artist page, maps to by-contributor */
    'aa5ccc77-a82e-465e-a9d5-79cf4098a926': '../../by-contributor/ellis-grey/',

    /* ── Places → /archive/by-place/ ── */
    'c6c69d44-8408-4a0a-9dbf-8b3ee903bc5f': '../../by-place/college-green-apt/',
    '3ecebfcc-6824-46a9-9e1a-ecc26f69a4a2': '../../by-place/the-tuna-can/',
    '26cbb244-48c7-49e5-863c-5dde5388dde1': '../../by-place/irvin-house/',
    'f30be60e-94b4-465a-8e75-8cbdefaffbc8': '../../by-place/melrose-house/',
    '362e9df6-ce39-4805-841e-c113e4e2a7c9': '../../by-place/frogwood-manor/',
    'e697fa03-e300-421a-8fd3-3b026d8d4f13': '../../by-place/twin-maples/',
    '1fc551c6-d3d5-43d0-a3bb-9e5606bdbebe': '../../by-place/green-street-apt/',

    /* ── Labels → /archive/by-label/ ── */
    '39446d03-fe9c-47d0-81a9-2b42d34fb400': '../../by-label/magmacrunch-media/',
    'c78b5612-2300-4ee1-8663-299ddcf9ce25': '../../by-label/magmacrunch-music/',
    '1d3190cc-b700-4409-bdb4-2ee8b93f3d8c': '../../by-label/magmacrunch-arcade/',
    'ad82d124-e41e-49e8-9bf9-53e836b44336': '../../by-label/the-slop-collective/',
};
