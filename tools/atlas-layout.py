"""Deterministic shelf layouts; vary width and crop unused page margins."""
def layout(rectangles, width):
    shelves, placements, pages = [], {}, 0
    for rect in sorted(rectangles, key=lambda r: (-r[4], -r[3])):
        _, _, _, w, h = rect
        candidates = [s for s in shelves if s['h'] >= h and s['x'] + w + 4 <= width]
        shelf = min(candidates, key=lambda s: (s['h'] - h, width-s['x']-w)) if candidates else None
        if shelf is None:
            bottom = shelves[-1]['y'] + shelves[-1]['h'] + 4 if shelves else 0
            if not pages or bottom + h + 4 > 1024:
                pages += 1
                bottom = 0
            shelf = {'p': pages-1, 'x': 0, 'y': bottom, 'h': h}
            shelves.append(shelf)
        placements[rect] = [shelf['p'], shelf['x'], shelf['y']]
        shelf['x'] += w + 4
    sizes = [(max(s['x'] for s in shelves if s['p']==i), max(s['y']+s['h']+4 for s in shelves if s['p']==i)) for i in range(pages)]
    return placements, sizes

def compact_layout(rectangles):
    minimum = max(r[3]+4 for r in rectangles)
    candidates = [layout(rectangles, w) for w in range(((minimum+63)//64)*64, 1025, 64)]
    # Account for request overhead, while retaining original 2048px texture limit.
    return min(candidates, key=lambda c: (sum(w*h for w,h in c[1]) + len(c[1])*65536, len(c[1])))
