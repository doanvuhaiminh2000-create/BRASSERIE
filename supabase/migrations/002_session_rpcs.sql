CREATE OR REPLACE FUNCTION add_pending_item(
  p_session_id TEXT,
  p_item JSONB,
  p_log JSONB
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_logs JSONB;
  v_new_items JSONB := '[]'::jsonb;
  v_item JSONB;
  v_found BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(items, '[]'::jsonb), COALESCE(event_logs, '[]'::jsonb) 
  INTO v_items, v_logs
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;
  
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF (v_item->>'status') = 'PENDING' 
       AND (v_item->'menuItem'->>'posCode') = (p_item->'menuItem'->>'posCode') 
       AND (v_item->>'isUpsold') = (p_item->>'isUpsold') THEN
      v_item := jsonb_set(
        v_item, 
        '{quantity}', 
        to_jsonb((v_item->>'quantity')::int + (p_item->>'quantity')::int)
      );
      v_found := TRUE;
    END IF;
    v_new_items := v_new_items || jsonb_build_array(v_item);
  END LOOP;

  IF NOT v_found THEN
    v_new_items := v_new_items || jsonb_build_array(p_item);
  END IF;

  v_logs := v_logs || jsonb_build_array(p_log);
  
  UPDATE live_sessions 
  SET items = v_new_items, event_logs = v_logs
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_pending_item_qty(
  p_session_id TEXT,
  p_item_id TEXT,
  p_delta INT
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_new_items JSONB := '[]'::jsonb;
  v_item JSONB;
BEGIN
  SELECT items INTO v_items
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  -- Iterate through elements to find target
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF (v_item->>'id') = p_item_id AND (v_item->>'status') = 'PENDING' THEN
      -- Update qty (min 1)
      v_item := jsonb_set(
        v_item, 
        '{quantity}', 
        to_jsonb(GREATEST(1, (v_item->>'quantity')::int + p_delta))
      );
    END IF;
    v_new_items := v_new_items || jsonb_build_array(v_item);
  END LOOP;

  UPDATE live_sessions 
  SET items = v_new_items
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION remove_pending_item(
  p_session_id TEXT,
  p_item_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_new_items JSONB := '[]'::jsonb;
  v_item JSONB;
BEGIN
  SELECT items INTO v_items
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF NOT ((v_item->>'id') = p_item_id AND (v_item->>'status') = 'PENDING') THEN
      v_new_items := v_new_items || jsonb_build_array(v_item);
    END IF;
  END LOOP;

  UPDATE live_sessions 
  SET items = v_new_items
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION send_round_to_kitchen(
  p_session_id TEXT,
  p_log JSONB,
  p_sent_at BIGINT
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_logs JSONB;
  v_new_items JSONB := '[]'::jsonb;
  v_item JSONB;
  v_current_round INT;
BEGIN
  SELECT COALESCE(items, '[]'::jsonb), COALESCE(event_logs, '[]'::jsonb), COALESCE(current_round, 1)
  INTO v_items, v_logs, v_current_round
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF (v_item->>'status') = 'PENDING' THEN
      v_item := jsonb_set(v_item, '{status}', '"SENT"');
      v_item := jsonb_set(v_item, '{sentAt}', to_jsonb(p_sent_at));
    END IF;
    v_new_items := v_new_items || jsonb_build_array(v_item);
  END LOOP;

  v_logs := v_logs || jsonb_build_array(p_log);

  UPDATE live_sessions 
  SET items = v_new_items, current_round = v_current_round + 1, event_logs = v_logs
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION serve_item(
  p_session_id TEXT,
  p_item_id TEXT,
  p_log JSONB,
  p_served_at BIGINT
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_logs JSONB;
  v_new_items JSONB := '[]'::jsonb;
  v_item JSONB;
BEGIN
  SELECT COALESCE(items, '[]'::jsonb), COALESCE(event_logs, '[]'::jsonb)
  INTO v_items, v_logs
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF (v_item->>'id') = p_item_id THEN
      v_item := jsonb_set(v_item, '{status}', '"SERVED"');
      v_item := jsonb_set(v_item, '{servedAt}', to_jsonb(p_served_at));
    END IF;
    v_new_items := v_new_items || jsonb_build_array(v_item);
  END LOOP;
  
  v_logs := v_logs || jsonb_build_array(p_log);

  UPDATE live_sessions 
  SET items = v_new_items, event_logs = v_logs
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cancel_item(
  p_session_id TEXT,
  p_item_id TEXT,
  p_reason TEXT,
  p_log JSONB
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_logs JSONB;
  v_new_items JSONB := '[]'::jsonb;
  v_item JSONB;
BEGIN
  SELECT COALESCE(items, '[]'::jsonb), COALESCE(event_logs, '[]'::jsonb)
  INTO v_items, v_logs
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF (v_item->>'id') = p_item_id THEN
      v_item := jsonb_set(v_item, '{status}', '"CANCELED"');
      v_item := jsonb_set(v_item, '{cancelReason}', to_jsonb(p_reason));
    END IF;
    v_new_items := v_new_items || jsonb_build_array(v_item);
  END LOOP;

  v_logs := v_logs || jsonb_build_array(p_log);

  UPDATE live_sessions 
  SET items = v_new_items, event_logs = v_logs
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_upsell_attempt(
  p_session_id TEXT,
  p_attempt JSONB,
  p_log JSONB
) RETURNS VOID AS $$
DECLARE
  v_attempts JSONB;
  v_logs JSONB;
BEGIN
  SELECT COALESCE(upsell_attempts, '[]'::jsonb), COALESCE(event_logs, '[]'::jsonb)
  INTO v_attempts, v_logs
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;
  
  v_attempts := v_attempts || jsonb_build_array(p_attempt);
  v_logs := v_logs || jsonb_build_array(p_log);
  
  UPDATE live_sessions 
  SET upsell_attempts = v_attempts, event_logs = v_logs
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION checkout_session(
  p_session_id TEXT,
  p_payment_method TEXT,
  p_log JSONB,
  p_closed_at BIGINT
) RETURNS VOID AS $$
DECLARE
  v_items JSONB;
  v_logs JSONB;
  v_item JSONB;
  v_has_unserved BOOLEAN := FALSE;
BEGIN
  SELECT COALESCE(items, '[]'::jsonb), COALESCE(event_logs, '[]'::jsonb)
  INTO v_items, v_logs
  FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
  LOOP
    IF (v_item->>'status') IN ('PENDING', 'SENT') THEN
      v_has_unserved := TRUE;
    END IF;
  END LOOP;

  IF v_has_unserved THEN
    RAISE EXCEPTION 'Cannot checkout session with unserved items';
  END IF;

  v_logs := v_logs || jsonb_build_array(p_log);

  UPDATE live_sessions 
  SET status = 'COMPLETED', payment_method = p_payment_method, closed_at = to_timestamp(p_closed_at / 1000.0), event_logs = v_logs
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;
