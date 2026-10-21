# ストーリー挿絵・生成記録

2026-10-21、内蔵 image_gen を使用。承認された日常・覚醒の2枚に、同じ絵柄の8枚を追加。全10話それぞれに専用挿絵を用意。選択済み画像は docs/story/ にWebPで保存。生成後の処理は幅1200pxへの縮小と圧縮のみ。

## 最終プロンプトセット

共通：Use case: illustration-story. One landscape 3:2 cinematic illustration for a Japanese animal baseball game. Hand-painted Japanese animated storybook art, tactile matte soft fur, expressive plushlike mascots, detailed painterly backgrounds, readable faces, clear silhouettes. Preserve Kotaro: orange Shiba, cream muzzle/eyebrows, red scarf, white-red baseball uniform. Mike: gray cat in purple uniform. Usami: ivory rabbit in green uniform/lavender scarf. Center-safe composition for phones. No text, captions, UI, logos, watermark, blood or injury. The approved sunset illustration is the primary style and identity reference.

| 保存先 | シーン別の指示 |
|---|---|
| docs/story/everyday.webp | Warm everyday friendship after practice. Shiba, gray cat, white rabbit and navy-uniform panda share rice balls on a wooden dugout bench at sunset. Affectionate interaction, dusty cleats, mitt and bat. Golden amber/leafy teal. The viewer should want to protect their ordinary tomorrow. |
| docs/story/beast.webp | Recognizable Shiba transformed into a powerful wild canine: broad shoulders, strong forearms, clawed paws, raised ruff, longer muzzle, ivory fangs, amber-red eyes. Same scarf/uniform, oversized bat, fiery aura/cool teal stadium. Cat bravely touches his wrist, rabbit watches with hope. Power coming under his own control, not evil possession. |
| docs/story/rescue.webp | Just after Kotaro pulls fallen Mike away from a runner's route beside second base. Shiba reassures relieved cat holding a glove. Tiger with teal scarf blurred behind them, rabbit hurries over. Point sacrificed to help a friend. Golden afternoon/dust. Both unharmed. |
| docs/story/lab.webp | Three friends discover an abandoned functioning lab. Teal monitor shows their animal silhouettes and measurement lines, no readable text. Shiba recognizes his shape, cat holds his paw, rabbit holds amber flashlight. Warm faces/cool machinery. Uncertainty, not horror. No revealed creator. |
| docs/story/ai.webp | Guardian AI as elegant teal circular core with thin rings above a console. Memory-images show village shelter, rabbit under medical blanket, repaired ballfield. Curiosity/gratitude mixed with concern over control. Warm footlights/teal architecture, no evil face. Final image includes familiar panda beside the three friends. |
| docs/story/ship.webp | Elegant saucer over ballfield at blue hour. Mint-green envoy, large black eyes, tiny antennae, blue baseball uniform/cap, white pants/red socks, offers a baseball to Shiba. Gray cat supports him, rabbit beside them. Awe and uncertainty, indigo/teal and warm floodlights. No weapons/destruction. |
| docs/story/teamwork.webp | Chapter 4 teamwork. Ivory rabbit Usami in green uniform/lavender scarf stands safely on first base, encouraging Shiba Kotaro at bat in white/red uniform and red scarf. Brown bear pitcher in charcoal/gold uniform behind them. Plausible baseball diamond, warm afternoon, confident glances, normal Shiba. Distinct composition from reference. |
| docs/story/archive.webp | Chapter 5 origins records. Four friends at an archive table, animal embryo outlines and field plans on a teal transparent record, no readable text or humans. Worried Shiba looks at his paw; gray cat gently holds it, rabbit reads a folder, navy-uniform panda brings tea. Warm desk lamp/cool shelves, intimate elevated view, shared curiosity and support. Do not reveal creator or imply former humans. |
| docs/story/final.webp | Chapter 9 decisive match. Six friends stack paws in a close huddle: Shiba, gray cat, ivory rabbit, navy-uniform panda, charcoal/gold brown bear, white/red tiger with teal scarf. Determined affectionate faces, normal Shiba. Night field, warm floodlights, teal starry sky, distant elegant saucer. Slightly elevated close view, clear silhouettes. Protect tomorrow together. |
| docs/story/epilogue.webp | Chapter 10 ordinary tomorrow restored. Six friends in a picnic circle on pale blanket on grass beside the field in fresh morning sunshine, clear blue sky/dew. Gray cat hands riceball to laughing Shiba; rabbit, panda with lunchbox, bear with thermos and tiger eating join them. Mitt/bat on grass. Promise fulfilled, calm relief. Distinct from sunset wooden bench. No human or mysterious silhouette. |

生成原本は Codex generated_images の本チャット用フォルダに保持。日常 exec-8243edb7-ea00-4302-9f04-8421b6465b3b.png、覚醒 exec-691a5acd-18b2-4475-bb4b-0739783a4aa8.png、救援 exec-a2941d05-f015-4a92-a1a6-94696afeceb3.png、研究所 exec-23d6ef0a-0a04-4bb2-b2d2-345ee55d6495.png、AI exec-ed041943-2e5d-4a43-930d-ad4fa880e5cf.png、宇宙船 exec-e3850901-6f30-47ad-b2d3-da8b8a761c80.png。

ゲームは原本のローカルパスに依存しない。docs/story/ を読み、配布用単一HTMLには画像も埋め込む。

## 終幕の3カット（同日追加・内蔵image_gen）

共通プロンプト：Use case illustration-story. Landscape 3:2 cinematic Japanese animated film background, natural human proportions, rich painterly detail, subtle film grain, amber late afternoon and pale blue sky. Anonymous short-dark-haired young adult in light-gray hooded jacket, dark trousers, off-white sneakers, black smartphone. Face hidden. Everyday Japanese neighborhood plaza, apartment buildings, trees and paving. No legible text, UI, numbers, watermark, animal characters or identity explanations. The street image is the location/clothing/style reference for the next two cuts.

| 保存先 | シーン別の最終指示 |
|---|---|
| docs/story/ending-street.webp | Adult seen entirely from behind holding phone low; mustard-jacket child reaches an empty hand toward sky after losing balloon. Upper half is spacious blue sky, detailed apartment plaza and amber shadows below. No painted balloon or string; animated foreground added by game. |
| docs/story/ending-jump.webp | Same adult at apex of impossibly high leap around second-floor balcony height. Low angle, back/three-quarter view, face hidden, one hand reaches up near upper-right sky, other holds phone low, bent legs and lifted jacket. Small child below, buildings frame lower corners to show height. No superhero aura, balloon or string. Gesture echoes baseball fielder. |
| docs/story/ending-hand.webp | First-person close-up of open natural human palm with five correct fingers and gray cuff, other hand holds black phone angled away, entirely dark reflective screen. In blurred background child holds returned red balloon on plaza. Warm rim light, quiet tactile detail, no scars/symbols or identity answers. |

原本：街 exec-aeae5bfc-3948-4599-96df-1f05a56b176a.png、跳躍 exec-264a85fe-71b4-45d4-91f3-cbb9a575a884.png、手元 exec-b4b24728-e5f6-4d40-b38d-6b9b57c8fdb4.png。同じチャットのgenerated_imagesフォルダに保持。幅1200px・WebP quality80への縮小/圧縮のみ。3枚429442bytes、全13枚1935996bytes。

追加4枚も内蔵image_genで1枚ずつ生成。共通参照は docs/story/everyday.webp（絵柄とキャラクターの同一性のみ、新構図）。原本は同じgenerated_imagesフォルダの、連携 exec-23854357-93bc-432d-984d-7a459d272dcb.png、記録調査 exec-04e886c8-e774-4f98-b7eb-a8ccaa03ad66.png、決戦 exec-4a400b82-59e4-4434-b4d8-dc094f30af22.png、後日談 exec-96176795-a973-42d4-91f7-096df53e19c2.png。追加分649744bytes、10枚合計1506554bytes。全画像1200×800・WebP quality80。第2話/第8話はイベントで専用絵を見せ、他は章の導入から表示する。
