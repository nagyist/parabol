import {Close} from '@mui/icons-material'
import type * as React from 'react'
import {cn} from '../cn'

interface Props {
  label: string
  picture?: string | null
  icon?: React.ReactElement | null
  className?: string
  onDelete?: (event: React.MouseEvent<SVGSVGElement, MouseEvent>) => void
}

export const Chip = (props: Props) => {
  const {label, className, picture, icon, onDelete} = props

  return (
    <div
      className={cn(
        'inline-flex h-8 cursor-default items-center justify-start gap-2 rounded-sm bg-slate-100 px-2 py-2',
        className
      )}
    >
      {icon}
      {picture && (
        <div className='relative h-6 w-6 rounded-sm border border-slate-100'>
          <div
            className='h-6 w-6 rounded-full bg-center bg-cover bg-no-repeat'
            style={{backgroundImage: `url('${picture}')`}}
          />
        </div>
      )}
      <div className='font-semibold text-gray-700 text-sm leading-normal'>{label}</div>
      {onDelete && (
        <Close
          className='cursor-pointer text-gray-700 text-sm hover:opacity-50'
          onClick={onDelete}
        />
      )}
    </div>
  )
}
