def validation_card(card, subjects, allowed_values, colors_limits, charcs_limits):
    import difflib  

    messages = []

    def add_msg(level, field, message, char_id=None, code=None, details=None):
        msg = {
            "level": level,    
            "field": field,     
            "char_id": char_id, 
            "code": code,       
            "message": message,
        }
        if details is not None:
            msg["details"] = details
        messages.append(msg)

    if isinstance(subjects, dict) and "data" in subjects:
        subjects_list = subjects["data"]
    else:
        subjects_list = subjects or []

    video = card.get("video")
    if video is None:
        add_msg(
            level="error",
            field="video",
            code="MISSING_VIDEO",
            message="Отсутствует поле «video» (видео не загружено).",
        )

    photos = card.get("photos", [])

    if not photos:
        add_msg(
            level="error",
            field="photos",
            code="NO_PHOTOS",
            message="Не загружено ни одной фотографии товара.",
        )
    else:
        logical_photos = 0

        for p in photos:
            if not isinstance(p, dict):
                continue

            has_any_url = any(
                isinstance(url, str) and url.strip()
                for url in p.values()
            )
            if has_any_url:
                logical_photos += 1

        if logical_photos == 0:
            add_msg(
                level="error",
                field="photos",
                code="INVALID_PHOTOS_BLOCK",
                message=(
                    "В блоке «photos» нет ни одного валидного изображения "
                    "(все объекты пустые или без URL)."
                ),
            )
        elif logical_photos < 30:
            add_msg(
                level="warning",
                field="photos",
                code="LOW_PHOTO_COUNT",
                message=(
                    f"Недостаточно фотографий: найдено {logical_photos} снимков. "
                    "Рекомендуется не менее 30 для лучшей конверсии и модерации."
                ),
            )
        elif logical_photos > 30:
            add_msg(
                level="warning",
                field="photos",
                code="HIGH_PHOTO_COUNT",
                message=(
                    f"Загружено {logical_photos} фотографий. "
                    "Рекомендуется не более 30 для стабильной модерации."
                ),
            )

    dimensions = card.get("dimensions")
    if not dimensions:
        add_msg(
            level="error",
            field="dimensions",
            code="MISSING_DIMENSIONS",
            message="Отсутствует блок «dimensions» (габариты упаковки).",
        )
    else:
        length = dimensions.get("length", 0)
        width = dimensions.get("width", 0)
        height = dimensions.get("height", 0)
        weightBrutto = dimensions.get("weightBrutto", 0)

        if not length or length <= 0:
            add_msg(
                level="error",
                field="dimensions.length",
                code="MISSING_LENGTH",
                message="Не указана длина в блоке «dimensions» (поле length).",
            )
        if not width or width <= 0:
            add_msg(
                level="error",
                field="dimensions.width",
                code="MISSING_WIDTH",
                message="Не указана ширина в блоке «dimensions» (поле width).",
            )
        if not height or height <= 0:
            add_msg(
                level="error",
                field="dimensions.height",
                code="MISSING_HEIGHT",
                message="Не указана высота в блоке «dimensions» (поле height).",
            )
        if not weightBrutto or weightBrutto <= 0:
            add_msg(
                level="error",
                field="dimensions.weightBrutto",
                code="MISSING_WEIGHT_BRUTTO",
                message="Не указана брутто-масса в блоке «dimensions» (поле weightBrutto).",
            )

    chars = card.get("characteristics", [])
    if not chars:
        add_msg(
            level="error",
            field="characteristics",
            code="MISSING_CHARACTERISTICS",
            message="Отсутствует блок «characteristics» (характеристики товара).",
        )
        return {
            "status": "error",
            "messages": messages,
        }

    chars_by_id = {c.get("id"): c for c in chars if c.get("id") is not None}
    subjects_by_id = {s.get("charcID"): s for s in subjects_list if s.get("charcID")}

    for subj in subjects_list:
        char_id = subj.get("charcID")
        name = subj.get("name", f"charcID={char_id}")
        required = subj.get("required", False)
        max_count = subj.get("maxCount", 0)

        card_char = chars_by_id.get(char_id)


        if required and card_char is None:
            add_msg(
                level="error",
                field=name,
                char_id=char_id,
                code="REQUIRED_MISSING",
                message=f"Не заполнена обязательная характеристика «{name}» (id={char_id}).",
            )
            continue

        if card_char is not None:
            value = card_char.get("value")
            if value is None or value == "" or value == []:
                if required:
                    add_msg(
                        level="error",
                        field=name,
                        char_id=char_id,
                        code="REQUIRED_EMPTY",
                        message=(
                            f"Обязательная характеристика «{name}» (id={char_id}) указана, "
                            "но значение не заполнено."
                        ),
                    )
                else:
                    add_msg(
                        level="warning",
                        field=name,
                        char_id=char_id,
                        code="EMPTY_VALUE",
                        message=(
                            f"Характеристика «{name}» (id={char_id}) указана без значения. "
                            "Рекомендуется заполнить для более точного описания товара."
                        ),
                    )

            if isinstance(value, list) and max_count and max_count > 0:
                if len(value) > max_count:
                    add_msg(
                        level="error",
                        field=name,
                        char_id=char_id,
                        code="EXCEED_MAXCOUNT",
                        message=(
                            f"Характеристика «{name}» (id={char_id}) содержит {len(value)} "
                            f"значений, что превышает допустимый максимум {max_count} по справочнику WB."
                        ),
                    )

    for c in chars:
        c_id = c.get("id")
        c_name = c.get("name", f"id={c_id}")
        if c_id not in subjects_by_id:
            add_msg(
                level="warning",
                field=c_name,
                char_id=c_id,
                code="UNKNOWN_CHAR",
                message=(
                    f"Характеристика «{c_name}» (id={c_id}) отсутствует в справочнике для данного subjectID. "
                    "Проверьте актуальность набора характеристик."
                ),
            )

    if len(chars) < len(subjects_list):
        add_msg(
            level="warning",
            field="characteristics",
            code="CHAR_COUNT_LESS",
            message=(
                f"Количество характеристик в карточке ({len(chars)}) меньше, "
                f"чем в справочнике ({len(subjects_list)}). Возможны пропуски важной информации."
            ),
        )

    if len(chars) > len(subjects_list):
        add_msg(
            level="warning",
            field="characteristics",
            code="CHAR_COUNT_MORE",
            message=(
                f"Количество характеристик в карточке ({len(chars)}) больше, "
                f"чем в справочнике ({len(subjects_list)}). Возможно, есть лишние или устаревшие характеристики."
            ),
        )

    allowed_values = allowed_values or {}
    colors_limits = colors_limits or {}
    charcs_limits = charcs_limits or {}

    for c in chars:
        name = c.get("name")
        value = c.get("value")
        char_id = c.get("id")

        if isinstance(value, list):
            values_list = value
        elif value is None or value == "":
            values_list = []
        else:
            values_list = [value]

        if name in allowed_values:
            allowed_list = list(allowed_values.get(name, []))
            allowed_set = set(allowed_list)

            invalid_values = [
                v for v in values_list
                if isinstance(v, str) and v not in allowed_set
            ]

            if invalid_values:
                suggestions = {}
                for bad in invalid_values:
                    close = difflib.get_close_matches(
                        bad,
                        allowed_list,
                        n=3,
                        cutoff=0.6, 
                    )
                    suggestions[bad] = close

                invalid_str = ", ".join(map(str, invalid_values))
                msg_text = (
                    f"Для характеристики «{name}» использованы недопустимые значения: {invalid_str}. "
                    "Используйте только значения из списка, разрешённого WB."
                )

                details = {
                    "invalid_values": invalid_values,
                    # пример: { "коричневый": ["кофейный", "насыщенный коричневый"] }
                    "suggestions": suggestions,
                }

                add_msg(
                    level="error",
                    field=name,
                    char_id=char_id,
                    code="VALUE_NOT_ALLOWED",
                    message=msg_text,
                    details=details,
                )

        field_limits = None
        if name in colors_limits:
            field_limits = colors_limits[name]
        elif name in charcs_limits:
            field_limits = charcs_limits[name]

        if field_limits:
            min_v = field_limits.get("min")
            max_v = field_limits.get("max")
            count = len(values_list)

            if isinstance(min_v, int) and min_v > 0 and count < min_v:
                add_msg(
                    level="warning",
                    field=name,
                    char_id=char_id,
                    code="BELOW_MIN_LIMIT",
                    message=(
                        f"Для характеристики «{name}» указано {count} значений, "
                        f"рекомендуемый минимум — {min_v}. "
                        "Добавьте ещё варианты для улучшения качества карточки."
                    ),
                )

            if isinstance(max_v, int) and max_v > 0 and count > max_v:
                add_msg(
                    level="warning",
                    field=name,
                    char_id=char_id,
                    code="ABOVE_MAX_LIMIT",
                    message=(
                        f"Для характеристики «{name}» указано {count} значений, "
                        f"рекомендуемый максимум — {max_v}. "
                        "Сократите количество значений, чтобы карточка была более точной и аккуратной."
                    ),
                )

    has_errors = any(m["level"] == "error" for m in messages)
    status = "error" if has_errors else "ok"

    return {
        "status": status,
        "messages": messages,
    }
