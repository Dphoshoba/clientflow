import { DeliverableStatus } from "@prisma/client";

const transitions: Record<DeliverableStatus, DeliverableStatus[]> = {
  DRAFT: [DeliverableStatus.IN_REVIEW],
  IN_REVIEW: [DeliverableStatus.CHANGES_REQUESTED, DeliverableStatus.APPROVED],
  CHANGES_REQUESTED: [DeliverableStatus.IN_REVIEW],
  APPROVED: [DeliverableStatus.DELIVERED, DeliverableStatus.IN_REVIEW],
  DELIVERED: [DeliverableStatus.IN_REVIEW],
};

export function isValidStatusTransition(current: DeliverableStatus, next: DeliverableStatus) {
  return transitions[current].includes(next);
}