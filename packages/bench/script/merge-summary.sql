.mode csv
.import combined-summary.csv summary

-- we start with two rows for each benchmark
-- and create one row for each benchmark with twice as many columns
ALTER TABLE summary ADD column bAvgTime REAL;
ALTER TABLE summary ADD column bGbPerSec REAL;
ALTER TABLE summary ADD column bMedianGpuTime REAL;
ALTER TABLE summary ADD column bGitVersion TEXT;
ALTER TABLE summary ADD column bUtc INTEGER;

UPDATE summary SET bAvgTime = (
  SELECT "avg time / run (ms)" FROM summary AS s2
  WHERE s2.benchmark = summary.benchmark
  AND s2.gitVersion != summary.gitVersion
);

UPDATE summary SET bGbPerSec = (
  SELECT "src GB/sec" FROM summary AS s2
  WHERE s2.benchmark = summary.benchmark
  AND s2.gitVersion != summary.gitVersion
);

UPDATE summary SET bMedianGpuTime = (
  SELECT "median gpu time (ms)" FROM summary AS s2
  WHERE s2.benchmark = summary.benchmark
  AND s2.gitVersion != summary.gitVersion
);

UPDATE summary SET bGitVersion = (
  SELECT "gitVersion" FROM summary AS s2
  WHERE s2.benchmark = summary.benchmark
  AND s2.gitVersion != summary.gitVersion
);

UPDATE summary SET bUtc = (
  SELECT "utc" FROM summary AS s2
  WHERE s2.benchmark = summary.benchmark
  AND s2.gitVersion != summary.gitVersion
);

-- we now have two sets of rows with the regular and b- columns reversed
-- drop one set, so that the b- columns remaining are the for older baseline 
DELETE FROM summary 
  WHERE gitVersion IN (
    SELECT gitVersion FROM summary
    ORDER BY utc ASC
    LIMIT 1
  );

.headers on
.output merged-summary.csv
select * from summary ORDER by benchmark;