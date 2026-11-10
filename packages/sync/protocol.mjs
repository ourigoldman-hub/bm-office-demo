/** Conservative per-form revision checks. Separate form types can sync independently.
 * Edits to the SAME form from two disconnected devices need human review.
 */
export function decideWrite({currentRevision, expectedRevision}) {
  if (!Number.isSafeInteger(currentRevision) || currentRevision < 0 ||
      !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
    return {ok:false, code:'invalid_revision'};
  }
  return currentRevision === expectedRevision
    ? {ok:true, nextRevision: currentRevision + 1}
    : {ok:false, code:'conflict_requires_review', currentRevision};
}
