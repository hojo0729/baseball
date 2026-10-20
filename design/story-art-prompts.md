# ストーリー挿絵・生成記録

2026-10-21、内蔵 image_gen を使用。承認された日常・覚醒の2枚に、同じ絵柄の4枚を追加。選択済み画像は docs/story/ にWebPで保存。生成後の処理は幅1200pxへの縮小と圧縮のみ。

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

生成原本は Codex generated_images の本チャット用フォルダに保持。日常 exec-8243edb7-ea00-4302-9f04-8421b6465b3b.png、覚醒 exec-691a5acd-18b2-4475-bb4b-0739783a4aa8.png、救援 exec-a2941d05-f015-4a92-a1a6-94696afeceb3.png、研究所 exec-23d6ef0a-0a04-4bb2-b2d2-345ee55d6495.png、AI exec-ed041943-2e5d-4a43-930d-ad4fa880e5cf.png、宇宙船 exec-e3850901-6f30-47ad-b2d3-da8b8a761c80.png。

ゲームは原本のローカルパスに依存しない。docs/story/ を読み、配布用単一HTMLには画像も埋め込む。
