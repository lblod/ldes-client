export type EndpointConfig = {
  name: string;
  LDES_BASE: string;
  FIRST_PAGE: string;
  TARGET_GRAPH: string;
  STATUS_GRAPH: string;
  EXTRA_HEADERS: Record<string, unknown>;
  VERSION_PREDICATE: string;
  TIME_PREDICATE: string;
  NEXT_PAGE_RELATIONSHIP_RDF_TYPE: string;
  onPageLoadError?: (error: Error) => Promise<void>;
  onPageFetchStart?: () => Promise<void>;
  onPageComplete?: (currentPage: string) => Promise<void>;
  onPageLoaded?: (currentPage: string) => Promise<void>;
};

export type Config = {
  endpoints: EndpointConfig[];
  onPageLoadError?: (error: Error, response: Response) => Promise<void>;
  onPageFetchStart?: () => Promise<void>;
  onPageComplete?: (currentPage: string) => Promise<void>;
  onPageLoaded?: (currentPage: string) => Promise<void>;
};
