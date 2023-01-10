import { useState, useEffect, MouseEvent } from "react";
import {
  EuiButtonIcon,
  EuiIconTip,
  EuiHeaderSection,
  EuiHeaderSectionItem,
  EuiFieldText,
  EuiHeader,
  EuiHeaderLinks,
  EuiHeaderLink,
  EuiPortal,
  EuiToolTip,
  EuiHeaderLogo,
} from "@elastic/eui";

import { Preferences } from "./Preferences";
import { useToast } from "./toastContext";

const UriInput = () => {
  const [uri, setUri] = useState("");
  const { addToast } = useToast();

  const onLaunch = async () => {
    if (uri === "") {
      addToast({ title: "Enter a URL", color: "warning" });
      return;
    }

    window.main.handleUrl(uri);
    setUri("");
  };

  const launchButton = (
    <EuiToolTip content="Launch">
      <EuiButtonIcon
        iconSize="m"
        iconType="launch"
        aria-label="Launch"
        display="base"
        color="success"
        onClick={(e: MouseEvent<HTMLElement>) => {
          e.currentTarget.blur();
          onLaunch();
        }}
      />
    </EuiToolTip>
  );

  return (
    <EuiHeaderSectionItem>
      <EuiFieldText
        placeholder="archive+ds9://"
        size={400}
        append={launchButton}
        prepend={
          <EuiIconTip
            type="link"
            content="Enter a URL to have it opened in DS9."
            color="text"
          />
        }
        value={uri}
        onChange={(e) => setUri(e.target.value)}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
            onLaunch();
          }
        }}
      ></EuiFieldText>
    </EuiHeaderSectionItem>
  );
};

export const Header = () => {
  const [isPrefVisisble, setIsPrefVisible] = useState(false);
  const [appVersion, setAppVersion] = useState("unkown");

  useEffect(() => {
    window.main.appVersion().then((v) => setAppVersion(v));
  }, []);

  const showPref = () => {
    setIsPrefVisible(true);
  };

  const closePref = () => {
    setIsPrefVisible(false);
  };

  const pref = (
    <EuiPortal>
      <Preferences onClose={closePref}></Preferences>
    </EuiPortal>
  );

  return (
    <EuiHeader position="fixed">
      <EuiHeaderSection>
        <EuiHeaderSectionItem>
          <EuiHeaderLogo
            iconType="savedObjectsApp"
            color="text"
            iconTitle="Archive DS9 URI Launcher"
          >
            <EuiToolTip content="Version">
              <>{appVersion}</>
            </EuiToolTip>
          </EuiHeaderLogo>
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
      <EuiHeaderSection>
        <UriInput></UriInput>
      </EuiHeaderSection>
      <EuiHeaderSection>
        <EuiHeaderSectionItem>
          <EuiHeaderLinks>
            <EuiHeaderLink iconType="gear" type="button" onClick={showPref}>
              Preferences
            </EuiHeaderLink>
          </EuiHeaderLinks>
          {isPrefVisisble && pref}
        </EuiHeaderSectionItem>
      </EuiHeaderSection>
    </EuiHeader>
  );
};
