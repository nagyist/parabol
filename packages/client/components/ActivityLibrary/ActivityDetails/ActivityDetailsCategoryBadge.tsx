import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import graphql from 'babel-plugin-relay/macro'
import {useFragment} from 'react-relay'
import type {ActivityDetailsCategoryBadge_template$key} from '~/__generated__/ActivityDetailsCategoryBadge_template.graphql'
import useTemplateCategoryMutation from '../../../mutations/UpdateTemplateCategoryMutation'
import {cn} from '../../../ui/cn'
import PlainButton from '../../PlainButton/PlainButton'
import {CATEGORY_ID_TO_NAME, CATEGORY_THEMES, type CategoryID, MAIN_CATEGORIES} from '../Categories'
import ActivityDetailsBadge from './ActivityDetailsBadge'

interface Props {
  isEditing: boolean
  templateRef: ActivityDetailsCategoryBadge_template$key
}

const ActivityDetailsCategoryBadge = (props: Props) => {
  const {isEditing, templateRef} = props
  const template = useFragment(
    graphql`
      fragment ActivityDetailsCategoryBadge_template on MeetingTemplate {
        id
        category
      }
    `,
    templateRef
  )
  const {id: templateId} = template
  const category = template.category as CategoryID
  const [commit] = useTemplateCategoryMutation()

  const updateTemplateCategory = (mainCategory: string) => {
    commit({variables: {templateId, mainCategory}})
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={!isEditing}>
        <PlainButton className={cn(!isEditing && 'cursor-default', 'flex')} disabled={false}>
          <ActivityDetailsBadge
            className={cn(`${CATEGORY_THEMES[category].primary}`, 'select-none text-white')}
          >
            {CATEGORY_ID_TO_NAME[category]}
          </ActivityDetailsBadge>
          {isEditing && <KeyboardArrowDownIcon />}
        </PlainButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className='rounded-sm border-rad bg-white shadow-lg data-[side="bottom"]:animate-slide-down data-[side="top"]:animate-slide-up'
          sideOffset={5}
        >
          <DropdownMenu.RadioGroup value={category} onValueChange={updateTemplateCategory}>
            {MAIN_CATEGORIES.map((c) => {
              const categoryId = c as CategoryID
              return (
                <DropdownMenu.RadioItem
                  key={categoryId}
                  className='flex cursor-pointer select-none px-4 py-3 outline-hidden data-[state=checked]:bg-slate-200 data-highlighted:bg-slate-100'
                  value={categoryId}
                >
                  <span
                    className={cn(`${CATEGORY_THEMES[categoryId].primary}`, 'h-5 w-5 rounded-full')}
                  ></span>
                  <span className='pr-10 pl-5 font-semibold text-xs'>
                    {CATEGORY_ID_TO_NAME[categoryId]}
                  </span>
                </DropdownMenu.RadioItem>
              )
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export default ActivityDetailsCategoryBadge
