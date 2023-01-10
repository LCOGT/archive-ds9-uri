import {
  EuiCodeBlock,
  EuiAccordion,
  EuiPanel,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiProgress,
  EuiCopy,
  EuiStat,
  useEuiTheme,
  EuiWindowEvent,
  EuiInMemoryTable,
  EuiLink,
  EuiTitle,
  EuiCallOut,
} from "@elastic/eui";

import { MouseEvent, ReactNode, useState } from "react";
import { css } from "@emotion/css";

import { useLaunchTasks } from "./launchTasksContext";
import type { LaunchTaskState, FrameState } from "../main/launchTaskStore";
import { useToast } from "./toastContext";

export const LaunchTaskList = () => {
  const { launchTasks } = useLaunchTasks();

  const tasks = Object.values(launchTasks)
    .reverse()
    .map((t, i) => <LaunchTask key={t.id} state={t} initialIsOpen={i === 0} />);

  return <>{tasks}</>;
};

const frameIsMosiac = (f: FrameState) => {
  return f.instrumentId?.includes("fa") && f.reductionLevel === 0;
};

export interface LaunchTaskProps {
  state: LaunchTaskState;
  initialIsOpen?: boolean;
}

export const LaunchTask = ({
  state,
  initialIsOpen = false,
}: LaunchTaskProps) => {
  const { euiTheme } = useEuiTheme();
  const { addToast } = useToast();
  const [isAltKey, setIsAltKey] = useState(false);
  const [isMouseOver, setIsMouseOver] = useState(false);

  let url;
  if (isAltKey && isMouseOver) {
    url = state.url;
  } else {
    url = decodeURIComponent(state.sanitizedUrl);
  }

  const frames = Object.values(state.frames);

  const allMosaic = frames.map((f) => frameIsMosiac(f)).every((x) => !!x);

  let progressBar;
  let statusStat;

  switch (state.status) {
    case "Initializing": {
      progressBar = <ProgressBar color="warning" />;
      statusStat = <StatusStat description={state.status} color="warning" />;
      break;
    }
    case "Downloading": {
      const sum = (a: number, b: number) => a + b;
      const totalBytes = frames
        .map((f) => f.totalBytes)
        .filter((n) => n)
        .reduce(sum, 0);
      const downloadedBytes = frames
        .map((f) => f.downloadedBytes)
        .filter((n) => n)
        .reduce(sum, 0);
      const percentComplete = 100 * (downloadedBytes / totalBytes);

      progressBar = <ProgressBar percent={percentComplete} />;
      statusStat = (
        <StatusStat
          description={state.status}
          title={`${Math.floor(percentComplete)}%`}
        />
      );
      break;
    }
    case "Launching": {
      progressBar = <></>;
      statusStat = <StatusStat description={state.status} color="warning" />;
      break;
    }
    case "Launched": {
      progressBar = <ProgressBar color="success" />;
      statusStat = <StatusStat description={state.status} color="success" />;
      break;
    }
    default: {
      progressBar = <></>;
      statusStat = (
        <StatusStat description={state.status} isLoading={false} title="--" />
      );
    }
  }

  const topContent = (
    <EuiFlexGroup justifyContent="spaceEvenly">
      <EuiFlexItem grow={true} className="eui-xScroll">
        <EuiCodeBlock
          whiteSpace="pre"
          language="uri"
          className={css`
            min-height: ${euiTheme.base * 5}px;
          `}
        >
          {url}
        </EuiCodeBlock>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{statusStat}</EuiFlexItem>
    </EuiFlexGroup>
  );

  let abortOrDeleteButton;

  if (state.status == "Aborted" || state.status == "Done") {
    abortOrDeleteButton = (
      <EuiToolTip content="Delete">
        <EuiButtonIcon
          iconType="trash"
          aria-label="Delete task"
          onClick={async (e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.blur();
            const res = await window.main.deleteTask(state.id);

            if (res.kind === "error") {
              addToast({ color: "danger", text: res.error });
            }
          }}
        />
      </EuiToolTip>
    );
  } else {
    abortOrDeleteButton = (
      <EuiToolTip content="Abort">
        <EuiButtonIcon
          iconType="cross"
          aria-label="Abort task"
          onClick={async (e: MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.blur();
            const res = await window.main.abortTask(state.id);

            if (res.kind === "error") {
              addToast({ color: "danger", text: res.error });
            }
          }}
        />
      </EuiToolTip>
    );
  }

  const extraActions = (
    <EuiFlexGroup style={{ textAlign: "center" }}>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={url} beforeMessage="Copy URL to clipboard">
          {(copy) => (
            <EuiButtonIcon
              iconType="copyClipboard"
              aria-label="Copy URL to clipboard"
              onClick={() => copy()}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{abortOrDeleteButton}</EuiFlexItem>
    </EuiFlexGroup>
  );

  let errorCallout = <></>;
  if (state.error.message !== undefined) {
    errorCallout = (
      <EuiFlexItem>
        <EuiCallOut
          title={state.error.name || "Error"}
          color="danger"
          iconType="alert"
        >
          {state.error.message}
          {!state.error.stack ? (
            <></>
          ) : (
            <EuiCodeBlock>{state.error.stack}</EuiCodeBlock>
          )}
        </EuiCallOut>
      </EuiFlexItem>
    );
  }

  const bottomContent = (
    <EuiFlexGroup direction="column">
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiStat
              titleSize="xxs"
              description="Download Directory"
              title={state.downloadDir || ""}
              isLoading={state.downloadDir === undefined}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              titleSize="xxs"
              description="Cleanup"
              title={state.cleanup}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiStat
              titleSize="xxs"
              description="All Mosiac"
              title={allMosaic ? "True" : "False"}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {errorCallout}
      <EuiFlexItem>
        <FramesTable frames={frames} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="row">
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>STDOUT</h3>
            </EuiTitle>
            <EuiCodeBlock
              language="shellsession"
              overflowHeight={200}
              isCopyable={true}
            >
              {state.stdout.join("")}
            </EuiCodeBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xxs">
              <h3>STDERR</h3>
            </EuiTitle>
            <EuiCodeBlock
              language="shellsession"
              overflowHeight={200}
              isCopyable={true}
            >
              {state.stderr.join("")}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const buttonCssClass = css`
    margin-right: ${euiTheme.size.base};
    &:hover {
      text-decoration: none;
    }
  `;

  return (
    <>
      <EuiWindowEvent
        event="keydown"
        handler={(ev) => setIsAltKey(ev.ctrlKey)}
      />
      <EuiWindowEvent event="keyup" handler={(ev) => setIsAltKey(ev.ctrlKey)} />
      <EuiPanel
        className={css`
          position: relative;
        `}
        onMouseEnter={() => setIsMouseOver(true)}
        onMouseLeave={() => setIsMouseOver(false)}
      >
        {progressBar}
        <EuiAccordion
          id={state.id}
          initialIsOpen={initialIsOpen}
          element="div"
          buttonElement="div"
          buttonClassName={`${buttonCssClass} eui-xScroll`}
          buttonContent={topContent}
          buttonContentClassName={css`
            width: 100%;
          `}
          extraAction={extraActions}
          tabIndex={-1}
        >
          <EuiSpacer />
          {bottomContent}
        </EuiAccordion>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};

const ProgressBar = ({
  percent = undefined,
  color = "success",
}: {
  percent?: undefined | number;
  color?: "success" | "warning";
}) => {
  return (
    <EuiProgress
      size="xs"
      position="absolute"
      {...{
        max: percent === undefined ? percent : 100,
        value: percent,
        color,
      }}
    />
  );
};

const StatusStat = ({
  description,
  title = undefined,
  color = undefined,
  isLoading = undefined,
}: {
  description: string;
  title?: undefined | ReactNode;
  color?: undefined | "warning" | "success" | "danger";
  isLoading?: undefined | boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  const colorString = color !== undefined ? euiTheme.colors[color] : color;

  return (
    <EuiStat
      descriptionElement="div"
      titleElement="div"
      css={{
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        justifyContent: "space-evenly",
        minWidth: euiTheme.base * 5,
      }}
      titleSize="s"
      textAlign="left"
      {...{
        description,
        title: title === undefined ? "" : title,
        isLoading: isLoading !== undefined ? isLoading : title === undefined,
        titleColor: colorString,
      }}
    />
  );
};

const FramesTable = ({ frames }: { frames: FrameState[] }) => {
  return (
    <EuiInMemoryTable
      tableCaption="Frames"
      tableLayout="auto"
      pagination={{
        pageSizeOptions: [5, 10],
      }}
      items={frames}
      sorting={{
        sort: {
          field: "id",
          direction: "desc",
        },
      }}
      columns={[
        {
          field: "id",
          name: "ID",
          sortable: true,
        },
        {
          field: "status",
          dataType: "string",
          name: "Status",
          sortable: true,
        },
        {
          field: "instrumentId",
          dataType: "string",
          name: "Instrument",
          sortable: true,
        },
        {
          field: "reductionLevel",
          dataType: "number",
          align: "center",
          name: "Reduction Level",
          sortable: true,
        },
        {
          name: "Mosaic",
          dataType: "boolean",
          render: (record: FrameState) => {
            return frameIsMosiac(record) ? "True" : "False";
          },
        },
        {
          name: "File",
          textOnly: true,
          dataType: "string",
          render: (record: FrameState) => {
            if (record.status === "Downloaded") {
              return (
                <EuiLink href={`file://${record.filepath}`} target="_blank">
                  {record.filename}
                </EuiLink>
              );
            }
            return record.filename;
          },
        },
        {
          name: "URL",
          textOnly: true,
          dataType: "string",
          render: (record: FrameState) => {
            return (
              <EuiLink href={record.downloadUrl} target="_blank"></EuiLink>
            );
          },
        },
        {
          name: "Progress",
          dataType: "number",
          render: (record: FrameState) => {
            return `${Math.ceil(
              (100 * record.downloadedBytes) / record.totalBytes
            )}%`;
          },
          sortable: ({ downloadedBytes }) => downloadedBytes,
        },
      ]}
    />
  );
};
