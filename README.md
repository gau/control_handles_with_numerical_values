# README

パスオブジェクトのハンドルを操作するIllustratorのスクリプト（jsx）です。

-----

### 更新履歴

* **0.5.2：上下キーでテキストフィールドの数値の増減に対応**
* 0.5.1：対象オブジェクトや対象ポイントが多すぎるときに警告を表示するように変更
* 0.5.0：新規作成

-----

### 対応バージョン

* Illustrator 2023

-----

### インストール方法

1. ダウンロードしたファイルを解凍します。
2. 所定の場所に「ハンドルを操作する.jsx」をコピーします。Windows版ではお使いのIllustratorの種類によって保存する場所が異なりますのでご注意ください。
3. Illustratorを再起動します。
4. `ファイル > スクリプト > ハンドルを操作する`と表示されていればインストール成功です。

#### ファイルをコピーする場所

| OS | バージョン | フォルダの場所 |
|:-----|:-----|:-----|
| Mac | 全 | /Applications/Adobe Illustrator *(ver)*/Presets/ja_JP/スクリプト/ |
| 32bit Win | CS5まで | C:\Program Files\Adobe\Adobe Illustrator *(ver)*\Presets\ja_JP\スクリプト\ |
| 64bit Win | CS5, CS6（32bit版） | C:\Program Files (x86)\Adobe\Adobe Illustrator *(ver)*\Presets\ja_JP\スクリプト\ |
| 64bit Win | CS6（64bit版）以降 | C:\Program Files\Adobe\Adobe Illustrator *(ver)* (64 Bit)\Presets\ja_JP\スクリプト\ |

* *(ver)*にはお使いのIllustratorのバージョンが入ります
* 本スクリプトは、2023以前では動作を検証しておりません

-----

### 使い方

1. 対称となるパスオブジェクト、またはアンカーポイントやセグメントを選択します。（複数可）
2. `ファイル > スクリプト > ハンドルを操作する`を選択します。
3. 「角度」と「距離」のスライダーでハンドルを操作します。
4. ［実行］をクリックします。

-----

### 処理できない選択

以下の場合は不適切な選択として処理を中止します。

* パスオブジェクトが選択されていない
* 有効なパス、アンカーポイント、セグメントが選択されていない

-----

### 注意

* 実行前にドキュメントを保存しておくことをお勧めします
* 必要なオブジェクトが見つからないとき、選択が不適切な場合は処理を中断します
* オブジェクトの種類や構造によって意図しない結果になる可能性もゼロではありません

-----

### 免責事項

* このスクリプトを使って起こったいかなる現象についても制作者は責任を負えません。すべて自己責任にてお使いください。
* OSのバージョンやその他の状況によって実行できないことがあるかもしれません。もし動かなかったらごめんなさい。

-----

### ライセンス

* ハンドルを操作する.jsx
* Copyright (c) 2023 Toshiyuki Takahashi
* Released under the MIT license
* [http://opensource.org/licenses/mit-license.php](http://opensource.org/licenses/mit-license.php)
* Created by Toshiyuki Takahashi ([Graphic Arts Unit](http://www.graphicartsunit.com/))
* [Twitter](https://twitter.com/gautt)
