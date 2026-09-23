WITH impact_goal AS (
  SELECT
    campaign_id,
    SUM(target * COALESCE(unit_cost, 0))::numeric(14, 2) AS goal_amount
  FROM campaign_impact_targets
  GROUP BY campaign_id
)
UPDATE campaigns AS c
SET
  goal_amount = impact_goal.goal_amount,
  updated_at = now()
FROM impact_goal
WHERE
  c.id = impact_goal.campaign_id
  AND impact_goal.goal_amount > 0
  AND c.goal_amount IS DISTINCT FROM impact_goal.goal_amount;
