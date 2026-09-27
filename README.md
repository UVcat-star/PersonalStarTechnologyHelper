# Star Technology 자동화 라인 정리

Star Technology(Theta 2) 모드팩에서 전력 티어별로 지어야 할 라인을 정리한 개인용 페이지입니다.
빌드 없이 정적 파일만으로 동작하고, 로컬에서 `index.html`을 바로 열어도 됩니다.

| 페이지 | 내용 |
|---|---|
| `hv.html` | HV: `Void Extractor` 체인, Crushed Ore 분류, `Sodium Persulfate`, C2F4 · PTFE, 3D 배치도 |
| `ev.html` | EV: Coming soon (HV에서 넘겨 둔 일 목록) |

- 탭은 `hv.html#void`, `hv.html#crushed`처럼 주소로 바로 열 수 있습니다.
- 사이드바의 티어 목록은 `assets/shell.js`의 `TIERS`에서 관리합니다. 새 티어는 여기에 한 줄 추가하고
  `<body data-tier="..">`를 단 페이지를 만들면 됩니다.
- 첫 화면(`index.html`)은 현재 티어 페이지로 넘어갑니다.

GitHub Pages: Settings → Pages → Source를 `main` 브랜치의 `/ (root)`로 지정합니다.

## 만든 방법

이 페이지와 안의 계산·도표는 [Claude](https://claude.com/claude-code)(Anthropic)의 도움을 받아 만들었습니다.
레시피 수치는 팩의 KubeJS 스크립트와 GTCEu jar에서 직접 확인했지만, 틀린 부분이 있을 수 있습니다.
**EMI 확인** 표시가 붙은 값은 게임 안에서 한 번 더 확인하세요.

## 권리와 게시 중단

개인 플레이 기록용 비공식 페이지이며, Star Technology 팀·GregTech CEu·각 모드 제작자와 관계가 없습니다.
모드팩, 모드, 아이템·퀘스트 이름에 대한 권리는 각 제작자에게 있습니다.
문제가 되는 내용이 있으면 이슈로 알려 주세요. 확인하는 대로 바로 내리겠습니다.

> This is an unofficial personal notes page, not affiliated with the Star Technology team,
> GregTech CEu, or any mod author. All modpack, mod, item and quest names belong to their
> respective owners. If anything here is a problem, please open an issue and it will be
> taken down promptly. Made with help from Claude (Anthropic).

## 라이선스

이 저장소의 코드(HTML/CSS/JS)는 [MIT](LICENSE)입니다. 모드팩과 모드의 내용에는 적용되지 않습니다.
