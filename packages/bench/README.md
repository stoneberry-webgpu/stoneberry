### Basic Use
Run the default benchmark configuration and save committed versions.
* current default config is: 100 runs, batch size 50, report median fastest
* ```sh
    pnpm bench 
    ```
* results are logged to the debug console and git committed versions 
  accumulate in `benchmarks.csv` to track results over time
* automatically launches the browser


### Detailed Analysis
Run the default benchmark configuration and save all run details to a .csv file,
suitable for further analysis
* ```sh
    pnpm bench:details
    ```
* results are logged to the debug console and written to `benchmarks-details.csv`

Convert the `benchmarks-details.csv` into files appropriate for the tableau dashboard
* ```sh
    pnpm bench:dashcsv
    ```
* `bench:dashcsv`` creates two files: `bench-details-{date}.csv`, `bench-summary-{date}.csv`.
* If a baseline is defined, `bench:dashcsv` creates two more files: 
  `merged-details-{date}.csv` and `merged-summary-{date}.csv`.

To look at the current results with tableau:
* Copy the tableau dashboard from: 
  https://public.tableau.com/app/profile/mighdoll/viz/shaderbenchmarking/Dashboard

To compare with a baseline and activate the full dashboard, save a baseline 
  before running `bench:dashcsv`:
* ```sh
  cp bench-details-2023-Nov-09_12-53-48.csv baseline-details.csv
  cp bench-summary-2023-Nov-09_12-53-48.csv baseline-summary.csv 
  ```

Then enter the merged/compare files into tableau (instead of `bench-details-*.csv` or `bench-summnary-*.csv`):
* See Data Source > details > Edit Connection
  * use both: `merged-details-{date}.csv` and `merged-summary-{date}.csv`.
  * relate the two files with the `gitVersion` field

### Variations

Run the default configuration and save a temporary .csv file
* ```sh
    pnpm bench:dev 
    ```
* results are logged to the debug console and accumulate in `benchmarks-dev.csv` 
  regardless of git commit status. 

Just launch Chrome configured for benchmarking:
* ```sh
    pnpm bench:browser
    ```
Run the default benchmark configuration and log to console w/o saving a csv file
* ```sh
    pnpm dev 
    ```
* automatically launches the browser

To visualize one chart w/o a baseline.
* See Data Source > details > Edit Connection
  * use only: `bench-details-{date}.csv` 
* Only the `details-only` tab will work in tableau unless there is a baseline.