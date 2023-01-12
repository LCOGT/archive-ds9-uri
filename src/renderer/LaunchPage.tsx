import { EuiPageTemplate, EuiCode } from "@elastic/eui";

import { LaunchTaskList } from "./LaunchTask";

export const LaunchPage = () => {
  const description = (
    <>
      Visit an <EuiCode language="uri">archive+ds9://...</EuiCode>
      URL and have it launched in DS9.
    </>
  );
  return (
    <EuiPageTemplate panelled={true}>
      <EuiPageTemplate.Header
        pageTitle="Launch"
        description={description}
      ></EuiPageTemplate.Header>
      <EuiPageTemplate.Section>
        <LaunchTaskList />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
