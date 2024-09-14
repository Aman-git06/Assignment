import { useState, useEffect, useRef } from 'react';
import { DataTable, DataTablePageEvent } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Checkbox, CheckboxChangeEvent } from 'primereact/checkbox';
import { OverlayPanel } from 'primereact/overlaypanel';
import { InputNumber, InputNumberChangeEvent } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import "primereact/resources/themes/lara-light-cyan/theme.css";

interface Artwork {
    id: number;
    title: string;
    place_of_origin: string;
    artist_display: string;
    inscriptions: string;
    date_start: number;
    date_end: number;
}

interface LazyState {
    first: number;
    rows: number;
    page: number;
}

export default function ArtworksTable() {
    const [artworks, setArtworks] = useState<Artwork[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [lazyState, setLazyState] = useState<LazyState>({
        first: 0,
        rows: 10,
        page: 1,
    });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [rowCountToSelect, setRowCountToSelect] = useState<number>(0);

    const op = useRef<OverlayPanel>(null);

    const fetchData = async (first: number, rows: number, page: number): Promise<Artwork[]> => {
        setLoading(true);
        try {
            const response = await fetch(`https://api.artic.edu/api/v1/artworks?page=${page}&limit=${rows}`);
            const data = await response.json();

            const artworkData: Artwork[] = data.data.map((artwork: any) => ({
                id: artwork.id,
                title: artwork.title,
                place_of_origin: artwork.place_of_origin,
                artist_display: artwork.artist_display,
                inscriptions: artwork.inscriptions || 'N/A',
                date_start: artwork.date_start,
                date_end: artwork.date_end,
            }));
            setTotalRecords(data.pagination.total);
            return artworkData;
        } catch (err) {
            console.error('Error fetching artworks:', err);
            return [];
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(lazyState.first, lazyState.rows, lazyState.page).then(setArtworks);
    }, [lazyState]);

    const onPage = (event: DataTablePageEvent) => {
        console.log('Page changed:', event); // Debugging
        setLazyState(prevState => ({
            ...prevState,
            first: event.first,
            rows: event.rows,
            page: Math.floor(event.first / event.rows) + 1 // Update page number based on `first` and `rows`
        }));
    };

    const isSelected = (id: number): boolean => {
        return selectedIds.has(id);
    };

    const onSelectRows = async () => {
        let remainingToSelect = rowCountToSelect;
        let currentPage = lazyState.page;
        let updatedSelection = new Set(selectedIds);

        while (remainingToSelect > 0) {
            const pageArtworks = currentPage === lazyState.page ? artworks : await fetchData(0, lazyState.rows, currentPage);
            const unselectedArtworks = pageArtworks.filter(artwork => !isSelected(artwork.id));
            const rowsToSelect = unselectedArtworks.slice(0, remainingToSelect);
            rowsToSelect.forEach(artwork => updatedSelection.add(artwork.id));
            remainingToSelect -= rowsToSelect.length;
            currentPage++;

            if (currentPage > Math.ceil(totalRecords / lazyState.rows)) break;
        }

        setSelectedIds(updatedSelection);
        op.current?.hide();
    };

    const onSelectAll = (e: CheckboxChangeEvent) => {
        if (e.checked) {
            artworks.forEach(artwork => selectedIds.add(artwork.id));
        } else {
            artworks.forEach(artwork => selectedIds.delete(artwork.id));
        }
        setSelectedIds(new Set(selectedIds));
    };

    return (
        <div className="card">
            <div className="selection-panel">
                <h3>Selected Artworks: {selectedIds.size}</h3>
                <Button label="Clear Selection" onClick={() => setSelectedIds(new Set())} />
            </div>

            <DataTable
                value={artworks}
                lazy
                dataKey="id"
                paginator
                first={lazyState.first}
                rows={lazyState.rows}
                totalRecords={totalRecords}
                onPage={onPage}
                loading={loading}
                rowsPerPageOptions={[5, 10, 15]}
                tableStyle={{ minWidth: '50rem' }}
                selection={artworks.filter(artwork => selectedIds.has(artwork.id))}
                onSelectionChange={(e) => setSelectedIds(new Set(e.value.map((artwork: Artwork) => artwork.id)))}
            >
                <Column
                    selectionMode="multiple"
                    header={
                        <Checkbox
                            checked={artworks.length > 0 && artworks.every(artwork => selectedIds.has(artwork.id))}
                            onChange={onSelectAll}
                        />
                    }
                    style={{ width: '3rem' }}
                />

                <Column
                    header={
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            Title 
                            <Button 
                                icon="pi pi-filter" 
                                className="p-button-text p-ml-2" 
                                onClick={(e) => op.current?.toggle(e)}
                                label="V" 
                                style={{ color: 'white', backgroundColor: '#06b6d4' }}
                            />
                            <OverlayPanel ref={op}>
                                <div style={{ padding: '10px' }}>
                                
                                    <h5>Select Rows</h5>
                                    <InputNumber 
                                        value={rowCountToSelect} 
                                        onValueChange={(e: InputNumberChangeEvent) => setRowCountToSelect(e.value as number)} 
                                        placeholder="Enter number" 
                                        min={1} 
                                        max={totalRecords}
                                        showButtons
                                    />
                                    <Button 
                                        label="Select" 
                                        onClick={onSelectRows} 
                                        className="p-mt-2"
                                    />
                                </div>
                            </OverlayPanel>
                        </div>
                    }
                    field="title" 
                    style={{ width: '20%' }}
                />

                <Column field="place_of_origin" header="Place of Origin" style={{ width: '15%' }} />
                <Column field="artist_display" header="Artist" style={{ width: '20%' }} />
                <Column field="inscriptions" header="Inscriptions" style={{ width: '20%' }} />
                <Column field="date_start" header="Date Start" style={{ width: '10%' }} />
                <Column field="date_end" header="Date End" style={{ width: '10%' }} />
            </DataTable>
        </div>
    );
}
