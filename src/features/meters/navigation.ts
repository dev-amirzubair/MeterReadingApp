export type MetersStackParamList = {
  MeterList: undefined;
  MeterForm: { meterId?: string };
  MeterDetail: { meterId: string };
  ReadingForm: {
    meterId: string;
    readingId?: string;
    /** When true, the camera launches automatically on first mount. */
    autoScan?: boolean;
  };
  ReadingsList: { meterId: string };
};
