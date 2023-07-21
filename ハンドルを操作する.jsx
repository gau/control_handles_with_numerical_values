(function() {

	// Settings
	var settings = {
		'show_alert' : true,
		'angle' : 0,
		'length' : 50,
		'angle_range' : [-180, 180],
		'length_range' : [0, 200],
		'enable_segment' : false,
		'existing_handles_only' : false,
		'no_edit_existing_handles' : false,
		'ignore_handles' : false,
		'reverse_motion' : false,
		'is_smooth' : true,
		'max_items' : 30,
		'max_points' : 100,
		'preview' : true,
		'onChanging' : true
	};

	// タイトルとバージョン
	const SCRIPT_TITLE = 'ハンドルを操作する';
	const SCRIPT_VERSION = '0.5.6';

	// プレビュー用レイヤーの設定
	const LAYER_NAME = '_gau_script_operate_handles_preview_layer';

	// PathPointのプロトタイプ
	function PathPoint(item, index) {
		this.index = index;
		this.item = item;
		this.path_point = item.pathPoints[index];
		this.update_both_sides_point();
	};
	PathPoint.prototype.get_both_sides_point = function(direction) {
		if (direction !== 'left' && direction !== 'right') return false;
		var both_sides_point = null;
		var point_length = this.item.pathPoints.length;
		var both_sides_index = direction === 'left' ? this.index - 1 : this.index + 1;
		if (this.item.closed) {
			if (both_sides_index < 0) {
				both_sides_index = point_length - 1;
			} else if (both_sides_index > point_length - 1) {
				both_sides_index = 0;
			}
			both_sides_point = this.item.pathPoints[both_sides_index];
		} else {
			both_sides_point = both_sides_index < 0 || both_sides_index > point_length - 1 ? null : this.item.pathPoints[both_sides_index];
		}
		if(!settings.enable_segment) {
			if(this.path_point.selected === PathPointSelection.RIGHTDIRECTION && direction === 'left') both_sides_point = null;
			if(this.path_point.selected === PathPointSelection.LEFTDIRECTION && direction === 'right') both_sides_point = null;
		} else {
			if(this.path_point.selected !== PathPointSelection.ANCHORPOINT) both_sides_point = null;
		}
		return both_sides_point;
	};
	PathPoint.prototype.update_both_sides_point = function() {
		this.both_sides_points = {
			left: this.get_both_sides_point('left'),
			right: this.get_both_sides_point('right')
		}
	};

	// ドキュメントと選択アイテム取得
	var doc = app.activeDocument;
	var sel = doc.selection;

	// 対称アイテム取得
	var target_path_items = get_target_items(sel, 'PathItem');

	// 選択状態を取得
	var selected_state = get_selected_state(target_path_items);

	// 対称のポイントを取得
	var target_points = [];
	var target_points_length = 0;
	for (var i = 0; i < target_path_items.length; i++) {
		target_points.push(get_target_points(target_path_items[i]));
	}

	var preview_layer;

	if(typeof settings.preview != 'boolean') settings.preview = false;
	if(typeof settings.onChanging != 'boolean') settings.onChanging = false;

	// JSONファイルから設定を読み込む
	var saveOptions = {
		'os' : File.fs,
		'jsxPath' : $.fileName,
		'reverseDomain' : 'com.graphicartsunit',
		'fileName' : 'operate_handles.json',
		'path' : ''
	};
	saveOptions.path = get_setting_file_path(saveOptions);
	load_settings();

	// ダイアログのプロトタイプ
	function MainDialog() {
		this.init();
		return this;
	};
	MainDialog.prototype.init = function() {
		var unit = 10;
		var _this = this;
		_this.dlg = new Window('dialog', SCRIPT_TITLE + ' - ver.' + SCRIPT_VERSION);
		_this.dlg.margins = [unit, unit * 3, unit, unit * 3];

		// Dialog - 角度
		_this.angleGroup = _this.dlg.add('group', undefined);
		_this.angleGroup.name = 'angle';
		_this.angleGroup.margins = [unit, unit / 2, unit, unit / 2];

		_this.angleGroup.add('statictext', undefined, '角度', {alignment:'left'});
		_this.angleSlider = _this.angleGroup.add('slider', [0, 0, 180, 23], settings.angle, settings.angle_range[0], settings.angle_range[1]);
		_this.angleText = _this.angleGroup.add('edittext', undefined, settings.angle);
		_this.angleText.minimumSize = [unit * 6, unit];
		_this.angleGroup.add('statictext', undefined, '度', {alignment:'left'});

		// Dialog - 長さ
		_this.lengthGroup = _this.dlg.add('group', undefined);
		_this.lengthGroup.name = 'length';
		_this.lengthGroup.margins = [unit, unit / 2, unit, unit];

		_this.lengthGroup.add('statictext', undefined, '長さ', {alignment:'left'});
		_this.lengthSlider = _this.lengthGroup.add('slider', [0, 0, 180, 23], settings.length, settings.length_range[0], settings.length_range[1]);
		_this.lengthText = _this.lengthGroup.add('edittext', undefined, settings.length);
		_this.lengthText.minimumSize = [unit * 6, unit];
		_this.lengthGroup.add('statictext', undefined, '％', {alignment:'left'});

		// Dialog - ヒントメッセージ
		var aiv = app.version.split('.')[0];
		if(!settings.onChanging && Number(aiv) > 16) {
			_this.noteGroup = _this.dlg.add('panel', undefined, 'HINT:');

			var noteText = saveOptions.os == 'Windows' ? '［Alt］、［Ctrl］' : '［command］［option］［control］';
			_this.noteText = _this.noteGroup.add('statictext', undefined, 'CC以降は' + noteText + 'のいずれかを押してもプレビューを更新できます', {multiline:true});
			_this.noteText.alignment = 'center';
			_this.noteText.minimumSize = [unit * 25, undefined];
		}

		// Dialog - オプションのグループ
		_this.optionsGroup = _this.dlg.add('panel', undefined, 'オプション:');
		_this.optionsGroup.margins = [unit * 2, unit * 2, unit * 2, unit];
		_this.optionsGroup.minimumSize = [310, undefined];
		_this.optionsGroup.alignment = 'center';
		_this.optionsGroup.orientation = 'column';

		var option_checkboxes = {
			enable_segment: _this.optionsGroup.add('checkbox', undefined, '選択アンカーポイントのみを対象'),
			no_edit_existing_handles: _this.optionsGroup.add('checkbox', undefined, '既存のハンドルを動かさない'),
			existing_handles_only: _this.optionsGroup.add('checkbox', undefined, '既存のハンドルのみ操作'),
			ignore_handles: _this.optionsGroup.add('checkbox', undefined, '既存のハンドルをすべてリセットして新しくする'),
			reverse_motion: _this.optionsGroup.add('checkbox', undefined, '対称ハンドルの動きを反転'),
		}
		function on_click_checkbox(event) {
			settings[this.name] = this.value;
			_this.angleText.dispatchEvent(new UIEvent(preview_event));
			if(this.name === 'existing_handles_only') {
				option_checkboxes.ignore_handles.enabled = this.value;
			}
		}
		for(var key in option_checkboxes) {
			option_checkboxes[key].alignment = 'left';
			option_checkboxes[key].name = key;
			option_checkboxes[key].value = settings[key];
			option_checkboxes[key].onClick = on_click_checkbox;
			if(key === 'existing_handles_only') option_checkboxes.ignore_handles.enabled = option_checkboxes[key].value;
		}

		// Dialog - フッターのグループ
		_this.footerGroup = _this.dlg.add('group', undefined);
		_this.footerGroup.margins = [unit, unit / 2, unit, unit * 0];
		_this.footerGroup.alignment = 'center';
		_this.footerGroup.orientation = 'row';

		// Dialog - 実行・キャンセルボタン
		_this.buttonGroup = _this.footerGroup.add('group', undefined);

		_this.cancel = _this.buttonGroup.add('button', undefined, 'キャンセル', {name: 'cancel'});
		_this.ok = _this.buttonGroup.add('button', undefined, '実行', { name:'ok'});

		/**
		 * プレビュー処理
		 * @param {event} event イベント
		 */
		function preview(event) {
			if(!settings.preview) return;
			var validated_angle = validate_value(_this.angleText.text, settings.angle_range[0], settings.angle_range[1]);
			var validated_langth = validate_value(_this.lengthText.text, settings.length_range[0], settings.length_range[1]);
			if(validated_angle != -1 && !isNaN(validated_angle) && validated_langth != -1 && !isNaN(validated_langth)) {
				settings.angle = validated_angle;
				settings.length = validated_langth;
				mainProcess(validated_angle, validated_langth, true);
				var dummyObject = doc.pathItems.add();
				dummyObject.remove();
				app.redraw();
				app.undo();
				restore_selection_state(target_path_items);
				// _this.angleText.active = true;
			}
			if(_this.angleText.text !== settings.angle) _this.angleText.text = settings.angle;
			if(_this.lengthText.text !== settings.length) _this.lengthText.text = settings.length;
		}

		/**
		 * テキストフィールドの値をスライダーに反映するイベントハンドラ
		 * @param {event} event イベント
		 */
		function update_slider(event) {
			var target = _this[this.parent.name + 'Slider'];
			target.value = Math.round(this.text);
		}

		/**
		 * スライダーの値をテキストフィールドに反映するイベントハンドラ
		 * @param {event} event イベント
		 */
		function update_value(event) {
			var target = _this[this.parent.name + 'Text'];
			target.text = Math.round(this.value);
			target.dispatchEvent(new UIEvent(preview_event));
		}

		/**
		 * 修飾キーと文字入力の組み合わせてプレビュー更新
		 * @param {event} event イベント
		 */
		function on_keyup(event) {
			event.preventDefault();
			// this.active = true;
			// alertP(this);
			if(event.keyName == 'Up') {
				if(this.text < settings[this.parent.name + '_range'][1]) {
					this.text = Number(this.text) + 1;
					this.active = true;
					this.dispatchEvent(new UIEvent(preview_event));
				} else {
					return
				}
			} else if(event.keyName == 'Down') {
				if(this.text > settings[this.parent.name + '_range'][0]) {
					this.text = Number(this.text) - 1;
					this.active = true;
					this.dispatchEvent(new UIEvent(preview_event));
				} else {
					return
				}
			}
			if(!settings.onChanging) {
				if(event.keyName == 'Alt' || event.keyName == 'Meta' || event.keyName == 'Control') {
					_this.angleText.dispatchEvent(new UIEvent(preview_event));
				}
			}
		}

		// イベントハンドラ - テキストフィールドの更新
		var preview_event = settings.onChanging ? 'changing' : 'change';
		_this.angleText.addEventListener(preview_event, preview);
		_this.angleText.addEventListener('keyup', on_keyup);
		_this.lengthText.addEventListener(preview_event, preview);
		_this.lengthText.addEventListener('keyup', on_keyup);

		// 初回プレビュー更新
		_this.angleText.dispatchEvent(new UIEvent(preview_event));

		// イベントハンドラ - テキストフィールドとスライダーを連動
		_this.angleText.addEventListener(preview_event, update_slider);
		_this.angleSlider.addEventListener(preview_event, update_value);
		_this.lengthText.addEventListener(preview_event, update_slider);
		_this.lengthSlider.addEventListener(preview_event, update_value);

		// 実行とキャンセルボタン押下のアクション
		_this.ok.onClick = function() {
			try {
				var validated_angle = validate_value(_this.angleText.text, settings.angle_range[0], settings.angle_range[1]);
				var validated_length = validate_value(_this.lengthText.text, settings.length_range[0], settings.length_range[1]);
				if(validated_angle != -1 && !isNaN(validated_angle) && validated_length != -1 && !isNaN(validated_length)) {
					settings.angle = validated_angle;
					settings.length = validated_length;
					mainProcess(validated_angle, validated_length, false);
					save_settings();
					_this.closeDialog();
				} else {
					_this.angleText.text = settings.angle;
				}
			} catch(e) {
				alert('エラーが発生して処理を実行できませんでした\nエラー内容：' + e);
			}
		}
		_this.cancel.onClick = function() {
			_this.closeDialog();
		}
	};
	MainDialog.prototype.showDialog = function() {
		this.dlg.show();
	};
	MainDialog.prototype.closeDialog = function() {
		this.dlg.close();
	};

	// 選択状態の確認とダイアログ実行
	if (!doc || sel.length < 1 || target_path_items.length < 1) {
		if(settings.show_alert) alert('対象となるオブジェクトがありません');
		return false;
	} else if (target_path_items.length > settings.max_items) {
		var conf = true;
		if(settings.show_alert) {
			conf = confirm('対象のオブジェクトが' + target_path_items.length + 'あります。動作が重くなったりクラッシュの原因となるため、一度に処理するオブジェクトは' + settings.max_items + '以下にしておくことをお勧めします。続けますか？');
		}
		if(conf) {
			var dialog = new MainDialog();
			dialog.showDialog();
		} else {
			return false;
		}
	} else if (target_points_length > settings.max_points) {
		var conf = true;
		if(settings.show_alert) {
			conf = confirm('対象のアンカーポイントが' + target_points_length + 'あります。動作が重くなったりクラッシュの原因となるため、一度に処理するアンカーポイントは'+ settings.max_points + '以下にしておくことをお勧めします。続けますか？');
		}
		if(conf) {
			var dialog = new MainDialog();
			dialog.showDialog();
		} else {
			return false;
		}
	} else {
		var dialog = new MainDialog();
		dialog.showDialog();
	}

	/**
	 * メインプロセス
	 * @param {number} angle 角度
	 * @param {number} length 倍率
	 * @param {boolean} is_preview プレビューモードかどうか
	 */
	function mainProcess(angle, length, is_preview) {

		if(!length) length = 0;
		var offset_angle = (angle > 180 ? 180 : angle) * Math.PI / 180;

		if(is_preview) {
			try {
				preview_layer = doc.layers.add();
				preview_layer.name = LAYER_NAME;
				preview_layer.zOrder(ZOrderMethod.BRINGTOFRONT);
			} catch (error) {
				preview_layer = sel[0].layer;
			}
		}

		for (var i = 0; i < target_points.length; i++) {
			var points = target_points[i];
			for (var j = 0; j < points.length; j++) {

				var point = points[j];
				var path_point = point.path_point;
				point.update_both_sides_point();

				for (var key in point.both_sides_points) {

					var both_sides_point = point.both_sides_points[key];

					var handle_distance = get_distance(path_point.anchor, path_point[key + 'Direction']) * length / 100;
					var handle_radian = get_angle(path_point.anchor, path_point[key + 'Direction'], false);

					if(both_sides_point === null || (settings.existing_handles_only && handle_distance === 0) || (settings.no_edit_existing_handles && handle_distance !== 0)) continue;

					var coefficient = key === 'left' ? -1 : 1;
					var radian = get_angle(path_point.anchor, both_sides_point.anchor, false);
					var distance = get_distance(path_point.anchor, both_sides_point.anchor) * length / 100;
					if(!settings.ignore_handles) {
						radian = handle_distance !== 0 ? handle_radian : radian;
						distance = handle_distance !== 0 ? handle_distance : distance;
					}
					if(settings.reverse_motion) {
						coefficient = -1;
					}
					var position = get_position(radian + offset_angle * coefficient, distance, path_point.anchor);
					path_point[key + 'Direction'] = position;
					if(is_preview) {
						draw_line(path_point.anchor, position, 1, 0.5, true);
						draw_circle(position, 6, 1);
					}

				}
				if(settings.is_smooth) {
					var angleLeft = get_angle(path_point.anchor, path_point.leftDirection, false);
					var angleRight = get_angle(path_point.rightDirection, path_point.anchor, false);
					if(angleLeft === angleRight && angleLeft !== 0 && angleRight !== 0) {
						path_point.pointType = PointType.SMOOTH;
					}
				}
			}
		}
	}

	/**
	 * 対象のpathPointを取得
	 * @param {object} selection 対象のオブジェクト
	 * @param {string} typename 対象となるオブジェクトのタイプ名
	 * @return {object} 対象のアイテム
	 */
	function get_target_items(selection, typename) {
		var items = [];
		for(var i = 0; i < selection.length; i++) {
			if(selection[i].typename === typename) {
				items.push(selection[i]);
			} else if(selection[i].typename === 'GroupItem') {
				items = items.concat(get_target_items(selection[i].pageItems, typename));
			}
		}
		return items;
	}

	/**
	 * 対象のpathPointを取得
	 * @param {object} target_items 対象のオブジェクト
	 * @return {array} 対象のpathPoint
	 */
	function get_target_points(target_items) {
		var points = [];
		for (var i = 0; i < target_items.pathPoints.length; i++) {
			try {
				var point = new PathPoint(target_items, i);
			} catch (error) {
				alert(error);
				continue;
			}
			if(point.path_point.selected !== PathPointSelection.NOSELECTION) points.push(point);
		}
		target_points_length += points.length;
		return points;
	}

	/**
	 * 選択状態を取得
	 * @param {object} selection 選択オブジェクト
	 */
	function get_selected_state(selection) {
		// if(selection.length > 1) return;
		var selected_array = [];
		for(i = 0; i < selection.length; i++) {
			var item = selection[i];
			var points = item.pathPoints;
			selected_array[i] = [];
			for(j = 0; j < points.length; j++) {
				selected_array[i][j] = points[j].selected;
			}
		}
		return selected_array;
	}

	/**
	 * 選択状態の復帰
	 * @param {object} selection 選択オブジェクト
	 */
	function restore_selection_state(selection) {
		// if(target.length > 1) return;
		for(var i = 0; i < selection.length; i++) {
			var item = selection[i];
			var points = item.pathPoints;
			for(var j = 0; j < points.length; j++) {
				points[j].selected = selected_state[i][j];
			}
		}
	}

	// Get the distance
	/**
	 * 2点の座標の距離を求める
	 * @param {array} p1 始点
	 * @param {array} p2 終点
	 * @return {number} 2点間の距離
	 */
	function get_distance(p1, p2) {
		return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
	}

	/**
	 * 2点の座標の角度を求める
	 * @param {array} p1 始点
	 * @param {array} p2 終点
	 * @param {boolean} isDegree 戻り値の種類（true:角度／false:ラジアン）
	 * @return {number} 2点間の角度
	 */
	function get_angle(p1, p2, isDegree) {
		var radian = Math.atan2(p2[1] - p1[1], p2[0] - p1[0]);
		if(isDegree) {
			return radian / Math.PI * 180;
		} else {
			return radian;
		}
	}

	/**
	 * 角度と距離から座標を求める
	 * @param {number} radian 角度（ラジアン）
	 * @param {number} distance 距離
	 * @param {array} offsetPoint 追加する距離の座標
	 * @return {array} 座標
	 */
	function get_position(radian, distance, offsetPoint) {
		return [
			Math.cos(radian) * distance + offsetPoint[0],
			Math.sin(radian) * distance + offsetPoint[1]
		];
	}

	/**
	 * フィールド値のバリデーション
	 * @param {number} value 値
	 * @param {number} min 最小値
	 * @param {array} max 最大値
	 * @return {number} 変換後のvalue
	 */
	function validate_value(value, min, max) {
		if(!isNaN(value)) {
			if(value < min) {
				// alert(min + '以下の値は' + min + 'として処理されます');
				return min;
			} else if(value > max) {
				// alert(max + 'より大きい値は' + max + 'として処理されます');
				return max;
			}
			return value;
		} else {
			var regex = /[-.+]+/;
			if(value.match(regex)) {
				return value;
			} else {
				alert('入力できるのは半角数字のみです');
			}
			return -1;
		}
	}

	/**
	 * 線を描画
	 * @param {number} from 始点座標
	 * @param {number} to 終点座標
	 * @param {number} strokeWidth 線幅
	 * @param {number} opacity 透明度
	 * @param {boolean} dashed 破線にするかどうか
	 * @return {pathItem} 描画したパスアイテム
	 */
	function draw_line(from, to, strokeWidth, opacity, dashed) {

		var sw = 1 / doc.views[0].zoom * strokeWidth;

		var line = preview_layer.pathItems.add();
		line.setEntirePath([from, to]);
		var color;
		var dcs = doc.documentColorSpace;
		if(dcs === DocumentColorSpace.CMYK) {
			color = new CMYKColor();
			color.black = 0;
			color.cyan = 0;
			color.magenta = 100;
			color.yellow = 0;
		} else {
			color = new RGBColor();
			color.red = 255;
			color.green = 0;
			color.blue = 128;
		}
		line.filled = false;
		line.stroked = true;
		line.strokeWidth = sw;
		line.strokeColor = color;
		line.opacity = opacity * 100;

		if(dashed) line.strokeDashes = [sw * 2, sw * 2];
		// line.name = settings.pathName;

		return line;
	}

	/**
	 * 円を描画
	 * @param {array} point 描画位置の座標
	 * @param {number} diameter 直径
	 * @param {number} opacity 透明度
	 * @return {pathItem} 描画したパスアイテム
	 */
	function draw_circle(point, diameter, opacity) {

		var di = 1 / doc.views[0].zoom * diameter;

		var cir = preview_layer.pathItems.ellipse(point[1] + di / 2, point[0] - di / 2, di, di);
		var color;
		var dcs = doc.documentColorSpace;
		if(dcs == DocumentColorSpace.CMYK) {
			color = new CMYKColor();
			color.black = 0;
			color.cyan = 0;
			color.magenta = 100;
			color.yellow = 0;
		} else {
			color = new RGBColor();
			color.red = 255;
			color.green = 0;
			color.blue = 128;
		}
		cir.stroked = false;
		cir.filled = true;
		cir.fillColor = color;
		cir.opacity = opacity * 100;
		return cir;
	}

	/**
	 * プロパティを列挙する
	 * @param {obj} obj オブジェクト
	 */
	function alertP(obj) {
		var str = 'typename : ' + obj.typename;
		for (var key in obj) {
			str += '\n' + key;
			try {
				str += ' -> ' + obj[key];
			} catch(e) {
				str += ' -> no data';
			}
		};
		alert(str);
	}

	/**
	 * 割合から数値を求める
	 * @param {number} percentage パーセンテージ
	 * @param {number} min 最小値
	 * @param {number} max 最大値
	 */
	function convert_percentage_to_range(percentage, min, max) {
		var value = (percentage / 100) * (max - min) + min;
		return value;
	}

	/**
	 * 数値から割合を求める
	 * @param {number} value 値
	 * @param {number} min 最小値
	 * @param {number} max 最大値
	 */
	function convert_range_to_percentage(value, min, max) {
		var percentage = ((value - min) / (max - min)) * 100;
		return percentage;
	}

	/**
	 * 設定の保存先パスを返す
	 * @param {object} options オプション
	 * @return {filepath} 設定の保存先パス
	 */
	function get_setting_file_path(options) {
		var filepath = '';
		switch(options.os) {
			case 'Macintosh':
				filepath = Folder.userData + '/' + options.reverseDomain + '/Illustrator/Scripts/' + options.fileName;
				break;
			case 'Windows':
				filepath = Folder.userData + '/' + options.reverseDomain + '/Illustrator/Scripts' + options.fileName;
				break;
			default :
				break;
		}
		return filepath;
	}

	/**
	 * JSONファイルから設定を読み込む
	 */
	function load_settings() {
		var dir = saveOptions.path.match(/(.*)(\/)/)[1];
		if(!new Folder(dir).exists) {
			new Folder(dir).create();
		} else if(new File(saveOptions.path).exists) {
			var settingFile = new File(saveOptions.path);
			settingFile.encoding = 'UTF-8';
			settingFile.open('r');
			var loadedSettings = settingFile.readln();
			loadedSettings = (new Function('return' + loadedSettings))();
			settingFile.close();
			loadedSettings.onChanging = settings.onChanging;
			settings = loadedSettings;
		}
	}

	/**
	 * 設定をJSONファイルで保存する
	 */
	function save_settings() {
		var settingFile = new File(saveOptions.path);
		settingFile.open('w');
		settingFile.write(settings.toSource());
		settingFile.close();
	}

}());