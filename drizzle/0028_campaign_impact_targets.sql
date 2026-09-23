CREATE TABLE "campaign_impact_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"impact_type" varchar(80) DEFAULT 'other' NOT NULL,
	"label" varchar(160) NOT NULL,
	"unit" varchar(120) NOT NULL,
	"target" numeric(14, 2) NOT NULL,
	"unit_cost" numeric(14, 2),
	"allocation_percent" numeric(5, 2),
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "campaign_impact_targets"
ADD CONSTRAINT "campaign_impact_targets_campaign_id_campaigns_id_fk"
FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "campaign_impact_targets_campaign_idx" ON "campaign_impact_targets" USING btree ("campaign_id");
CREATE INDEX "campaign_impact_targets_campaign_sort_idx" ON "campaign_impact_targets" USING btree ("campaign_id", "sort_order");
CREATE INDEX "campaign_impact_targets_primary_idx" ON "campaign_impact_targets" USING btree ("campaign_id", "is_primary");

INSERT INTO "campaign_impact_targets" (
	"campaign_id",
	"impact_type",
	"label",
	"unit",
	"target",
	"unit_cost",
	"allocation_percent",
	"is_primary",
	"sort_order"
)
SELECT
	"id",
	CASE
		WHEN lower("impact_unit") LIKE '%coral%' OR lower("impact_unit") LIKE '%karang%' THEN 'coral'
		WHEN lower("impact_unit") LIKE '%mangrove%' THEN 'mangrove'
		WHEN lower("impact_unit") LIKE '%seagrass%' THEN 'seagrass'
		WHEN lower("impact_unit") LIKE '%hectare%' OR lower("impact_unit") LIKE '%protected%' THEN 'protection'
		WHEN lower("impact_unit") LIKE '%carbon%' OR lower("impact_unit") LIKE '%co2%' THEN 'carbon'
		ELSE 'other'
	END,
	CASE
		WHEN lower("impact_unit") LIKE '%coral%' OR lower("impact_unit") LIKE '%karang%' THEN 'Coral restoration'
		WHEN lower("impact_unit") LIKE '%mangrove%' THEN 'Mangrove restoration'
		WHEN lower("impact_unit") LIKE '%seagrass%' THEN 'Seagrass restoration'
		WHEN lower("impact_unit") LIKE '%hectare%' OR lower("impact_unit") LIKE '%protected%' THEN 'Protection'
		WHEN lower("impact_unit") LIKE '%carbon%' OR lower("impact_unit") LIKE '%co2%' THEN 'Estimated carbon benefit'
		ELSE 'Primary impact'
	END,
	"impact_unit",
	"impact_target",
	"impact_unit_cost",
	100,
	true,
	0
FROM "campaigns"
WHERE "impact_target" > 0;
