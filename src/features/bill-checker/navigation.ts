export type BillCheckerStackParamList = {
  BillCheckerForm: undefined;
  BillWebView: {
    url: string;
    title: string;
    /** Optional meta shown in the WebView header banner. */
    meterName?: string;
    consumerNumber?: string;
    discoLabel?: string;
  };
};
