import type { TransportModeId } from '../../bridge/schema';

export interface PassengerFlowModeWeights {
  time: number;
  price: number;
  comfort: number;
}

export const passengerFlowModeIds: TransportModeId[] = [
  'hSR',
  'airplane',
  'bus',
  'suburbanTrain',
  'longDistanceTrain',
  'car',
];

export const passengerFlowModeWeights: Record<TransportModeId, PassengerFlowModeWeights> = {
  hSR: {
    time: 0.7,
    price: 0.1,
    comfort: 0.2,
  },
  airplane: {
    time: 0.7,
    price: 0.2,
    comfort: 0.1,
  },
  bus: {
    time: 0.3,
    price: 0.6,
    comfort: 0.1,
  },
  suburbanTrain: {
    time: 0.3,
    price: 0.3,
    comfort: 0.4,
  },
  longDistanceTrain: {
    time: 0.1,
    price: 0.7,
    comfort: 0.2,
  },
  car: {
    time: 0.4,
    price: 0.1,
    comfort: 0.5,
  },
};
