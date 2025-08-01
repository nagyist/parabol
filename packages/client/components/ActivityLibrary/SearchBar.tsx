import {Search as SearchIcon} from '@mui/icons-material'
import type {ChangeEvent} from 'react'

interface Props {
  searchQuery: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}

const SearchBar = (props: Props) => {
  const {searchQuery, onChange} = props
  return (
    <div className='ml-2 flex grow items-center rounded-full bg-slate-200 px-4 py-2 outline-1 outline-hidden outline-offset-0 focus-within:outline-sky-500'>
      <input
        className='w-full border-none bg-transparent font-sans text-slate-700 text-sm placeholder-slate-800 outline-hidden'
        autoFocus
        autoComplete='off'
        name='search'
        placeholder='Search'
        type='text'
        onChange={onChange}
        value={searchQuery}
      />
      <SearchIcon fontSize='small' className='text-slate-600' />
    </div>
  )
}

export default SearchBar
