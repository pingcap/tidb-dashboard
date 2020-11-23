import { useEffect, useMemo, useState } from 'react'
import { createHashHistory } from 'history';

const history = createHashHistory();

export default function useQueryParams() {
  // Instead of using `useLocation`, this hook access history directly, so that it can work
  // without a `<Router>` in the tree.
  const [search, setSearch] = useState(history.location.search)
  useEffect(() => history.listen(({location}) => {
    setSearch(location.search)
  }), []);

  const params = useMemo(() => {
    const searchParams = new URLSearchParams(search)
    let _params: { [k: string]: any } = {}
    for (const [k, v] of searchParams) {
      _params[k] = v
    }
    return _params
  }, [search])

  return params
}
