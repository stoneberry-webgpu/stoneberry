import React from "react";
import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";

import styles from "./index.module.css";

function HomepageHeader(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/api">
            API Documentation
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={`${siteConfig.title}`} description="WebGPU core shaders/>">
      <HomepageHeader />
      <main>
        <pre>
          <code lang="typescript">
            {`
        import { PrefixScan } from "stoneberry/scan";
        import { bufferI32, labeledGpuDevice} from "thimbleberry";

        async function main(): Promise<void> {
          const device = await labeledGpuDevice();
          const srcData = [1, 2, 3, 4, 5, 6];
          const src = bufferI32(device, srcData);

          // inclusive scan
          const prefixScan = new PrefixScan({ device, src });
          const inclusiveResult = await prefixScan.scan();
        }
         `}
          </code>
        </pre>
      </main>
    </Layout>
  );
}
