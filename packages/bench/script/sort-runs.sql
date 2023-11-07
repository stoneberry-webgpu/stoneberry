.mode csv
.import compare.csv details
ALTER TABLE details ADD COLUMN sortId INTEGER;

-- remove extra header rows in data
DELETE from details WHERE benchmark = 'benchmark';

-- cte to find the totals
WITH totals AS (
  SELECT 
    benchmark,
    duration,
    runId,
    gitVersion
  FROM details
  WHERE name LIKE '%gpu total'
),
-- cte to order the totals by duration
sequence AS (
  SELECT 
    *,
    row_number() OVER (
      PARTITION BY benchmark,gitVersion
      ORDER BY duration DESC
    ) as sortId
  FROM totals 
)
-- update the sortId for all rows
UPDATE details SET sortId = (
  SELECT sortId 
  FROM sequence 
  WHERE sequence.gitVersion = details.gitVersion
    AND sequence.benchmark = details.benchmark
    AND sequence.runId = details.runId 
);

.headers on
.output sorted-compare.csv
SELECT * FROM details ORDER BY benchmark,gitVersion,sortId;


-- probably this could be rewritten without the windowing tricks (see OVER clause above)
-- by first creating a separate table for the totals...
