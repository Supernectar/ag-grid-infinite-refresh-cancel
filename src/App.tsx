'use client';
import { useMemo, useCallback, useRef } from "react";
import { AgGridReact, CustomCellRendererProps } from "ag-grid-react";
import type { ColDef, IDatasource, IGetRowsParams } from "ag-grid-community";
import {
  InfiniteRowModelModule,
  ModuleRegistry,
  PaginationModule,
  ValidationModule,
} from "ag-grid-community";

ModuleRegistry.registerModules([
  PaginationModule,
  InfiniteRowModelModule,
  ValidationModule
]);

enum Status {
  Alive = "Alive",
  Dead = "Dead",
  unknown = "unknown",
}
interface Character {
  id: string;
  name: string;
  status: Status
}

const defaultApiPageSize = 20  // default fixed rickandmortyapi page size
const paginationPageSize = 12  // less than the rickandmortyapi default page size, this allows to populate multiple grid pages for each API call 
const maxConcurrentDatasourceRequests = 2

const getRandomStatus = (): Status => {
  const statuses = [Status.Alive, Status.Dead, Status.unknown];
  return statuses[Math.floor(Math.random() * statuses.length)];
};

const fetchData = async (params: IGetRowsParams) => {
  const { startRow } = params;
  const url = `https://rickandmortyapi.com/api/character?page=${Math.floor(startRow / defaultApiPageSize) + 1}`;

  const response = await fetch(url);

  const jsonResponse = await response.json();
  const characters: Character[] = jsonResponse.results.map((char: Character) => ({
    ...char,
    status: getRandomStatus(),
  }));

  return {totalDataCount: jsonResponse.info.count, pageData: characters};
};

export default function InfiniteGrid() {
  const gridRef = useRef<AgGridReact>(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: '600px' }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const refreshButtonContainerStyle = useMemo(() => ({ display: 'flex', justifyContent: 'flex-end' }), []);

  const columnDefs = useMemo<ColDef[]>(() => [
    {
      field: "id",
      cellRenderer: (props: CustomCellRendererProps) => {
        console.log(props)
        if (props.value !== undefined) {
          return props.value;
        } else {
          return (
            <img src="https://www.ag-grid.com/example-assets/loading.gif" />
          );
        }
      }
    },
    { field: "name", flex: 1 },
    { field: "status" },
  ], []);

  const dataSource = useMemo<IDatasource>(() => ({
    rowCount: undefined,
    getRows: async (params) => {
      try {
        const {totalDataCount, pageData} = await fetchData(params);

        params.successCallback(
          pageData,
          totalDataCount <= params.endRow ? totalDataCount : -1
        );
      } catch (error) {
        console.log("Fetch request failed", error);
        params.failCallback();
      }
    },
  }), []);

  const refreshData = useCallback(() => {
    gridRef.current?.api.purgeInfiniteCache();
  }, []);

  return (
    <div style={containerStyle}>
      <div style={gridStyle}>
        <AgGridReact
          ref={gridRef}
          datasource={dataSource}
          columnDefs={columnDefs}
          rowModelType="infinite"
          cacheBlockSize={defaultApiPageSize}
          maxConcurrentDatasourceRequests={maxConcurrentDatasourceRequests}
          maxBlocksInCache={maxConcurrentDatasourceRequests}
          pagination={true}
          paginationPageSize={paginationPageSize}
          paginationPageSizeSelector={false}
        />
      </div>
      <div style={refreshButtonContainerStyle}>
        <button onClick={refreshData}>Refresh</button>
      </div>
    </div>
  );
}
