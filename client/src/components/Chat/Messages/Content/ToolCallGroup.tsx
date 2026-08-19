import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useRecoilValue } from 'recoil';
import { ChevronDown, Users } from 'lucide-react';
import { Tools, Constants, ContentTypes, ToolCallTypes } from 'librechat-data-provider';
import type {
  TAttachment,
  TMessageContentParts,
  Agents,
  FunctionToolCall,
} from 'librechat-data-provider';
import type { PartWithIndex } from './ParallelContent';
import { useLocalize, useExpandCollapse, scheduleMessageContentLayoutReconcile } from '~/hooks';
import { cn, getToolDisplayLabel } from '~/utils';
import { StackedToolIcons } from './ToolOutput';
import { useMCPIconMap } from '~/hooks/MCP';
import { AttachmentGroup } from './Parts';
import store from '~/store';
import { isBashProgrammaticToolCall } from './routing';

interface ToolMeta {
  name: string;
  iconName: string;
  hasOutput: boolean;
}

function getToolMeta(part: TMessageContentParts): ToolMeta | null {
  if (part.type !== ContentTypes.TOOL_CALL) {
    return null;
  }
  const toolCall = part[ContentTypes.TOOL_CALL];
  if (!toolCall) {
    return null;
  }

  const isStandard =
    'args' in toolCall && (!toolCall.type || toolCall.type === ToolCallTypes.TOOL_CALL);
  if (isStandard) {
    const tc = toolCall as Agents.ToolCall & { progress?: number };
    /** Subagents can finish with `progress === 1` and no final output
     *  text (the parent saw "" / undefined back). Fall back to progress
     *  so the group header flips from "Running N agents" to "Ran N
     *  agents" on completion even when the child returned no text. */
    const completed = !!tc.output || tc.progress === 1;
    const name = tc.name ?? '';
    const iconName = isBashProgrammaticToolCall(name, tc.args) ? Tools.bash_tool : name;
    return { name, iconName, hasOutput: completed };
  }

  if (toolCall.type === ToolCallTypes.CODE_INTERPRETER) {
    const ci = (toolCall as { code_interpreter?: { outputs?: unknown[] } }).code_interpreter;
    return {
      name: 'code_interpreter',
      iconName: 'code_interpreter',
      hasOutput: (ci?.outputs?.length ?? 0) > 0,
    };
  }

  if (toolCall.type === ToolCallTypes.RETRIEVAL || toolCall.type === ToolCallTypes.FILE_SEARCH) {
    return {
      name: 'file_search',
      iconName: 'file_search',
      hasOutput: !!(toolCall as { output?: string }).output,
    };
  }

  if (toolCall.type === ToolCallTypes.FUNCTION && ToolCallTypes.FUNCTION in toolCall) {
    const fn = (toolCall as FunctionToolCall).function;
    return { name: fn.name, iconName: fn.name, hasOutput: !!fn.output };
  }

  return null;
}

interface ToolCallGroupProps {
  parts: PartWithIndex[];
  isSubmitting: boolean;
  isLast: boolean;
  renderPart: (
    part: TMessageContentParts,
    idx: number,
    isLastPart: boolean,
    onToolExpand?: () => void,
  ) => React.ReactNode;
  lastContentIdx: number;
  groupAttachments?: TAttachment[];
  initialExpansionState?: ToolCallGroupExpansionState;
  onExpansionChange?: (state: ToolCallGroupExpansionState) => void;
}

export type ToolCallGroupExpansionState = {
  isExpanded: boolean;
  userOverride: boolean;
};

export default function ToolCallGroup({
  parts,
  isSubmitting,
  isLast,
  renderPart,
  lastContentIdx,
  groupAttachments,
  initialExpansionState,
  onExpansionChange,
}: ToolCallGroupProps) {
  const localize = useLocalize();
  const mcpIconMap = useMCPIconMap();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const cancelLayoutReconcileRef = useRef<(() => void) | null>(null);
  const count = parts.length;

  const toolMetadata = useMemo(() => parts.map((p) => getToolMeta(p.part)), [parts]);
  const allCompleted = useMemo(
    () => toolMetadata.every((m) => m?.hasOutput === true),
    [toolMetadata],
  );
  const toolNames = useMemo(() => toolMetadata.map((m) => m?.name ?? ''), [toolMetadata]);
  const iconToolNames = useMemo(() => toolMetadata.map((m) => m?.iconName ?? ''), [toolMetadata]);

  /** Subagent tool calls get their own label verb ("Running/Ran N agents")
   *  since "Used N tools" reads oddly when the "tools" are actually child
   *  agents. `subagentCount === count` ⇒ the group is 100% subagents. */
  const subagentCount = useMemo(
    () => toolNames.filter((n) => n === Constants.SUBAGENT).length,
    [toolNames],
  );
  const allSubagents = subagentCount > 0 && subagentCount === count;
  /** Past-tense label once the parent stream is no longer live OR every
   *  child has a terminal signal (output / progress === 1). Without the
   *  `!isSubmitting` branch, a cancelled or errored subagent that never
   *  reached `progress === 1` would leave the header stuck on "Running
   *  N agents" forever — each individual card already renders its own
   *  terminal state ("Cancelled agent", "Agent errored"), so the group
   *  summary needs to match that tense. */
  const subagentsDone = allSubagents && (allCompleted || !isSubmitting);
  let completedSubagentCount = 0;
  if (allSubagents) {
    completedSubagentCount = isSubmitting
      ? toolMetadata.filter((meta) => meta?.hasOutput).length
      : count;
  }

  const toolNameSummary = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const rawName of toolNames) {
      if (!rawName) continue;
      const label = getToolDisplayLabel(rawName, localize);
      if (!seen.has(label)) {
        seen.add(label);
        labels.push(label);
      }
    }
    if (labels.length <= 3) {
      return labels.join(', ');
    }
    return `${labels.slice(0, 3).join(', ')}, +${labels.length - 3}`;
  }, [toolNames, localize]);

  const autoExpand = useRecoilValue(store.autoExpandTools);
  const autoCollapse = !autoExpand && count >= 2 && allCompleted;
  const initialState = initialExpansionState?.userOverride === true ? initialExpansionState : null;
  const [isExpanded, setIsExpanded] = useState(
    initialState?.isExpanded ?? (autoExpand || !autoCollapse),
  );
  const [userOverride, setUserOverride] = useState(initialState != null);
  const [shouldRenderBody, setShouldRenderBody] = useState(isExpanded);
  const previousIsExpandedRef = useRef(isExpanded);
  const { style: expandStyle, ref: expandRef } = useExpandCollapse(isExpanded);
  const notifyLayoutChange = useCallback(() => {
    cancelLayoutReconcileRef.current?.();
    cancelLayoutReconcileRef.current = scheduleMessageContentLayoutReconcile(rootRef.current);
  }, []);

  useEffect(
    () => () => {
      cancelLayoutReconcileRef.current?.();
    },
    [],
  );

  useEffect(() => {
    const wasExpanded = previousIsExpandedRef.current;
    previousIsExpandedRef.current = isExpanded;
    if (wasExpanded && !isExpanded) {
      notifyLayoutChange();
    }
  }, [isExpanded, notifyLayoutChange]);

  useEffect(() => {
    if (autoCollapse && !userOverride) {
      setIsExpanded(false);
    }
  }, [autoCollapse, userOverride]);

  const handleToggle = useCallback(() => {
    const nextExpanded = !isExpanded;
    setUserOverride(true);
    if (nextExpanded) {
      setShouldRenderBody(true);
    }
    setIsExpanded(nextExpanded);
    onExpansionChange?.({ isExpanded: nextExpanded, userOverride: true });
  }, [isExpanded, onExpansionChange]);

  const handleToolExpand = useCallback(() => {
    setUserOverride(true);
    setShouldRenderBody(true);
    setIsExpanded(true);
    onExpansionChange?.({ isExpanded: true, userOverride: true });
  }, [onExpansionChange]);

  const handleTransitionEnd = useCallback(
    (event: React.TransitionEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }
      if (isExpanded) {
        return;
      }
      setShouldRenderBody(false);
      notifyLayoutChange();
    },
    [isExpanded, notifyLayoutChange],
  );

  const getSubagentLabel = () =>
    subagentsDone
      ? localize('com_ui_ran_n_agents', { 0: String(count) })
      : localize('com_ui_running_n_agents', { 0: String(count) });
  const groupLabel = allSubagents
    ? getSubagentLabel()
    : localize('com_ui_used_n_tools', { 0: String(count) });

  const hasActiveToolCall = useMemo(
    () => isSubmitting && toolMetadata.some((m) => m && !m.hasOutput),
    [toolMetadata, isSubmitting],
  );

  useEffect(() => {
    if (hasActiveToolCall && !userOverride) {
      setShouldRenderBody(true);
      setIsExpanded(true);
    }
  }, [hasActiveToolCall, userOverride]);

  return (
    <div className="mb-2 mt-1" ref={rootRef}>
      <div
        className={cn(
          allSubagents &&
            'bg-surface-secondary/40 overflow-hidden rounded-xl border border-border-light shadow-sm',
        )}
      >
        <button
          type="button"
          className={cn(
            'inline-flex w-full items-center gap-2 text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy',
            allSubagents ? 'relative px-3 py-2.5' : 'py-1',
          )}
          onClick={handleToggle}
          aria-expanded={isExpanded}
          aria-label={groupLabel}
        >
          {allSubagents ? (
            /** Subagent groups don't have per-tool icons — StackedToolIcons
             *  falls back to a generic wrench that reads as "tools" rather
             *  than "agents". A single Users glyph matches the individual
             *  subagent card header and keeps the visual language consistent. */
            <div
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-tertiary text-text-secondary',
                !allCompleted && isSubmitting && 'text-primary',
              )}
              aria-hidden="true"
            >
              <Users size={15} />
            </div>
          ) : (
            <StackedToolIcons
              toolNames={iconToolNames}
              mcpIconMap={mcpIconMap}
              maxIcons={4}
              isAnimating={!allCompleted && isSubmitting}
            />
          )}
          <span className="tool-status-text min-w-0 flex-1 text-left font-medium">
            {groupLabel}
          </span>
          {/** Hide the tool-name summary for pure-subagent groups — every
           *   entry deduplicates to the same "subagent" token, which adds
           *   noise without info. Mixed groups keep the summary. */}
          {toolNameSummary && !allSubagents && (
            <span className="text-xs font-normal text-text-secondary">— {toolNameSummary}</span>
          )}
          {allSubagents && (
            <span className="shrink-0 text-xs tabular-nums text-text-secondary" aria-hidden="true">
              {completedSubagentCount}/{count}
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-text-secondary transition-transform duration-200 ease-out',
              isExpanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
          {allSubagents && hasActiveToolCall && (
            <span
              className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-surface-tertiary"
              aria-hidden="true"
            >
              <span className="block h-full w-1/3 animate-pulse rounded-full bg-primary" />
            </span>
          )}
        </button>
        <div style={expandStyle} onTransitionEnd={handleTransitionEnd} aria-hidden={!isExpanded}>
          {shouldRenderBody && (
            <div className="overflow-hidden" ref={expandRef}>
              <div
                className={cn(
                  allSubagents ? 'border-t border-border-light px-2 pb-2 pt-1' : 'py-0.5 pl-4',
                )}
              >
                {parts.map(({ part, idx }) =>
                  renderPart(part, idx, isLast && idx === lastContentIdx, handleToolExpand),
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {groupAttachments && groupAttachments.length > 0 && (
        <AttachmentGroup attachments={groupAttachments} />
      )}
    </div>
  );
}
