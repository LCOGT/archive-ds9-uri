import { useState, MouseEvent } from "react";
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiButton,
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiSwitch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiFieldPassword,
  EuiPanel,
  useEuiTheme,
} from "@elastic/eui";

import { useToast } from "./toastContext";
import { usePreferences } from "./preferencesContext";
import { css } from "@emotion/css";

interface PreferncesProps {
  onClose: () => void;
}

export const Preferences = ({ onClose }: PreferncesProps) => {
  const { euiTheme } = useEuiTheme();
  const { prefs, setPrefs } = usePreferences();

  const [apiToken, setApiToken] = useState(prefs.token);
  const [ds9Path, setDs9Path] = useState(prefs.ds9.path);
  const [ds9Args, setDs9Args] = useState(prefs.ds9.args);
  const [ds9MosaicArgs, setDs9MosaicArgs] = useState(prefs.ds9.mosaicArgs);
  const [customDownloadDirEnable, setCustomDownloadDirEnable] = useState(
    prefs.customDownloadDir.enabled
  );
  const [customDownloadDirPath, setCustomDownloadDirPath] = useState(
    prefs.customDownloadDir.path
  );
  const [customDownloadDirCleanup, setCustomDownloadDirCleanup] = useState(
    prefs.customDownloadDir.cleanup
  );

  const { addToast } = useToast();
  const [showErrors, setShowErrors] = useState(false);

  const onSave = async () => {
    setShowErrors(true);

    if (!ds9Path || (customDownloadDirEnable && !customDownloadDirPath)) {
      addToast({ title: "Preferences Invalid", color: "warning" });
      return;
    }

    await setPrefs({
      token: apiToken,
      ds9: {
        path: ds9Path,
        args: ds9Args,
        mosaicArgs: ds9MosaicArgs,
      },
      customDownloadDir: {
        enabled: customDownloadDirEnable,
        path: customDownloadDirPath,
        cleanup: customDownloadDirCleanup,
      },
    });

    addToast({ title: "Preferences Saved", color: "success" });
  };

  const selectDs9PathButton = (
    <EuiButtonIcon
      iconSize="xxl"
      iconType="folderOpen"
      aria-label="Select DS9"
      display="base"
      color="success"
      onClick={async (e: MouseEvent<HTMLElement>) => {
        e.currentTarget.blur();
        const result = await window.main.showOpenDialog({
          title: "Select DS9 executable",
          buttonLabel: "Select",
          properties: ["openFile", "treatPackageAsDirectory"],
        });

        if (result.canceled) {
          return;
        }

        setDs9Path(result.filePaths.at(0));
      }}
    ></EuiButtonIcon>
  );

  const selectCustomDownloadDirButton = (
    <EuiButtonIcon
      iconSize="xxl"
      iconType="folderOpen"
      aria-label="Select Download Directory"
      display="base"
      color="success"
      disabled={!customDownloadDirEnable}
      onClick={async (e: MouseEvent<HTMLElement>) => {
        e.currentTarget.blur();
        const result = await window.main.showOpenDialog({
          title: "Select Custom Download Directory",
          buttonLabel: "Select",
          properties: ["openDirectory"],
        });

        if (result.canceled) {
          return;
        }

        setCustomDownloadDirPath(result.filePaths.at(0));
      }}
    ></EuiButtonIcon>
  );

  const settingGroupPanelCss = css`
    border: ${euiTheme.border.width.thick} dashed ${euiTheme.border.color};
  `;

  return (
    <EuiFlyout size="s" onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>Preferences</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm>
          <EuiFormRow label="API Token">
            <EuiFieldPassword
              type="dual"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
            ></EuiFieldPassword>
          </EuiFormRow>
          <EuiFormRow label="DS9">
            <EuiPanel
              hasShadow={false}
              hasBorder={true}
              className={settingGroupPanelCss}
            >
              <EuiFormRow
                label="Executable"
                isInvalid={showErrors && !ds9Path}
                error="Path can not be empty"
              >
                <EuiFieldText
                  value={ds9Path}
                  onChange={(e) => setDs9Path(e.target.value)}
                  append={selectDs9PathButton}
                ></EuiFieldText>
              </EuiFormRow>
              <EuiFormRow label="CLI Arguments">
                <EuiFieldText
                  value={ds9Args}
                  onChange={(e) => setDs9Args(e.target.value)}
                ></EuiFieldText>
              </EuiFormRow>
              <EuiFormRow label="Mosaic CLI Arguments">
                <EuiFieldText
                  value={ds9MosaicArgs}
                  onChange={(e) => setDs9MosaicArgs(e.target.value)}
                ></EuiFieldText>
              </EuiFormRow>
            </EuiPanel>
          </EuiFormRow>
          <EuiFormRow label="Custom Download Directory">
            <EuiPanel
              hasShadow={false}
              hasBorder={true}
              className={settingGroupPanelCss}
            >
              <EuiFormRow label="Enable">
                <EuiSwitch
                  checked={customDownloadDirEnable}
                  onChange={(e) => setCustomDownloadDirEnable(e.target.checked)}
                  showLabel={false}
                  label=""
                />
              </EuiFormRow>
              <EuiFormRow
                label="Location"
                isInvalid={
                  customDownloadDirEnable &&
                  showErrors &&
                  !customDownloadDirPath
                }
                error="Path can not be empty"
              >
                <EuiFieldText
                  value={customDownloadDirPath}
                  onChange={(e) => setCustomDownloadDirPath(e.target.value)}
                  append={selectCustomDownloadDirButton}
                  disabled={!customDownloadDirEnable}
                ></EuiFieldText>
              </EuiFormRow>
              <EuiFormRow label="Cleanup">
                <EuiSwitch
                  checked={customDownloadDirCleanup}
                  onChange={(e) =>
                    setCustomDownloadDirCleanup(e.target.checked)
                  }
                  disabled={!customDownloadDirEnable}
                  showLabel={false}
                  label=""
                />
              </EuiFormRow>
            </EuiPanel>
          </EuiFormRow>
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceEvenly">
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton onClick={onSave}>Save</EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton onClick={onClose} color="danger">
                Close
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
