import CheckBoxIcon from '@mui/icons-material/CheckBox'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {forwardRadix} from '../forwardRadix'

export const MenuItemCheckbox = forwardRadix<typeof DropdownMenu.CheckboxItem>(
  ({checked, children, ...props}, ref) => {
    return (
      <DropdownMenu.CheckboxItem
        asChild
        ref={ref}
        {...props}
        onSelect={(e) => {
          e.preventDefault()
        }}
        checked={checked}
      >
        <div className='mx-1 flex outline-none'>
          <div
            data-highlighted={checked ? '' : undefined}
            className={
              'flex w-full cursor-pointer items-center space-x-2 rounded-md in-data-highlighted:bg-slate-100 px-3 py-2 in-data-highlighted:text-slate-900 text-slate-700 text-sm leading-8 outline-hidden hover:bg-slate-200! hover:text-slate-900 focus:bg-slate-200'
            }
          >
            <div className='flex size-4 cursor-pointer appearance-none items-center justify-center rounded-xs border-slate-600 in-data-[state=unchecked]:border-2 bg-white outline-none'>
              <DropdownMenu.ItemIndicator className='flex items-center justify-center'>
                <CheckBoxIcon className='w-5 fill-sky-500' />
              </DropdownMenu.ItemIndicator>
            </div>
            <div className='flex select-none flex-col text-sm'>{children}</div>
          </div>
        </div>
      </DropdownMenu.CheckboxItem>
    )
  }
)
