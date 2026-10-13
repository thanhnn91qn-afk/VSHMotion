---
name: vshmotion
description: Use when asked to make, edit, shorten, rebuild or test a video clip (9:16, 16:9, kiosk, tuyên truyền, giáo dục sức khỏe, dự thi) for Bệnh viện Việt Nam - Thụy Điển Uông Bí, or to turn a vsh.org.vn article or a .docx script into a clip.
---

# VSHMotion — clips for Bệnh viện Việt Nam - Thụy Điển Uông Bí

Repo: `E:\DU AN\Video\VSHMotion` (GitHub `thanhnn91qn-afk/VSHMotion`). Full manual:
`HUONG-DAN-TAO-VIDEO.md` — read the section you need, not all of it.

A clip is one JSON script in `scenes/`. Narration length sets each scene's length; the
director (`director.mjs`) fills in style, motif, transition, sound when left blank.

## Workflow

1. Write `scenes/scenes-<topic>.json`: `brand.outName`, scenes with `id`, `kicker`,
   `headline`, `voice`, optional `photo`, `lines`, `chart`, `stat`. Leave `style` blank
   unless there is a reason.
2. `npm test`, then `node build-styles.mjs --scenes=<file> --name=<topic> --stills`
   (16:9: `build-16x9.mjs`, a different `--name`). **Open `build/stills/*.png` and look.**
3. Full build without `--stills` (3–6 min). One build at a time — the machine has ~8 GB RAM.
4. `python tools/look.py out/<outName>.mp4 --out build/look --expect <s> --expect-audio`;
   extract and view frame 0 and a few mid frames.
5. Deliver both `out/<outName>.mp4` and `-silent.mp4`, sending the file to the user.
   Commit and push only when asked.

Duration estimate before TTS: ~4.2 syllables per second of `voice`.

## The user's rules (each was broken once and corrected)

| Rule | Instead |
|---|---|
| Photos only from this hospital: BVVN-TĐUB watermark, vsh.org.vn articles, or files the user put in `anh/` | Never other hospitals (incl. BV Đa khoa tỉnh), never stock photos of hospitals |
| Photo must show what the sentence says | No matching photo → no photo (`plain`, motif or icon), never a people photo as filler |
| No photo and no motif twice in one clip | `npm test` / the build warns — fix, don't ship |
| Real system screenshots hide patient name, record number, BHYT number | Use demo data or mask |
| Every number in `voice` written as words | "hai mươi lăm tháng Chín", not "25/9" |
| "test" / "thử" = ONE clip, new `outName` | Never overwrite a delivered clip; never build the whole set |
| Output goes to the repo's `out/` | Not to `E:\DU AN\Video` |
| Music is generated (`tools/make-music.py`) or royalty-free | No copyrighted tracks |
| TTS server API (`POST /tts {text}` on port 8000) stays as is | Don't change the server to suit the pipeline |

## Common mistakes

- Reusing `--name` across clips or formats: voice and scene caches are per `--name`.
- Editing `voice` and trusting old timing: the cache re-records on text change, but
  re-check the `[tts]` lengths against the plan.
- Claiming done without looking: read stills, frame 0, and `look.py` numbers first.
- `look.py` G3 "end hold" fails on clips whose narration runs to the end — that is fine;
  a `still` stretch over ~3 s inside a scene is not.
- A landscape photo in 9:16 crops the subject out: set `"focus": "76% 50%"`.
