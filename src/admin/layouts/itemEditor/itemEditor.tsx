import React, { useState } from 'react';
import { Link, Redirect, useParams } from 'react-router-dom';
import { Routes } from 'common/const';
import { encodeImage } from 'common/utils';
import { ArrowLeftTwoTone } from 'common/icons';
import { Category, Item, Tax, AppActions } from 'common/types';
import { getItemById } from 'common/helpers';
import { newItem } from 'common/prototypes';
import { CategoryPicker } from '../../components';
import styles from './itemEditor.module.css';

type ItemEditorProps = {
  items: Item[];
  categories: Category[];
  taxes: Tax[],
  actions: AppActions;
};

type ItemEditorState = {
  name: string;
  parentId: number;
  price: string;
  costPrice: string;
  color: string;
  picture: string;
  taxes: number[];
};

const ItemEditor: React.FC<ItemEditorProps> = ({ items, categories, taxes, actions }) => {
  const { id } = useParams();
  const currentItem = id ? getItemById(items, Number(id)) : null;
  const initialState: ItemEditorState = {
    name: currentItem?.name || '',
    parentId: currentItem?.parentId || 0,
    price: `${currentItem?.price || 0}`,
    costPrice: `${currentItem?.costPrice || 0}`,
    color: currentItem?.color || '',
    picture: currentItem?.picture || '',
    taxes: currentItem?.taxes || [],
  };

  const [item, setItem] = useState<ItemEditorState>(initialState);
  const [redirect, setRedirect] = useState('');
  const [isPickerShown, togglePicker] = useState(false);

  // Helpers
  const selectedCategoryName = categories.find(entity => entity.id === item.parentId)?.name || 'Home Screen';
  const updateItem = (data: Partial<ItemEditorState>) => setItem({ ...item, ...data });
  const isInvalid = !item.name;

  const getItem = (): Item => {
    const { price, costPrice, ...other } = item;
    return newItem({ ...other, price: parseFloat(price), costPrice: parseFloat(costPrice) });
  };

  const handleOnChangeCategoryPicker = (categoryId: number) => updateItem({ parentId: categoryId });

  const handleOnClickOnPrimaryBtn = () => {
    if (currentItem) {
      // update an existing item
      const { price, costPrice, ...other } = item;
      actions.item.update({ ...currentItem, ...other, price: parseFloat(price), costPrice: parseFloat(costPrice) });
    } else {
      // create a new item
      actions.item.add(getItem());
    }
    setRedirect(Routes.AdminItemList);
  };

  if (redirect) return <Redirect to={redirect} />;

  const renderTaxList = taxes.filter(tax => tax.isEnabled).map(tax => (
    <div key={`ItemEditorTax_${tax.id}`} className={styles.switch}>
      <div className={styles.controlLabel} />
      <input
        type="checkbox"
        id={`ItemEditorTax_${tax.id}`}
        checked={item.taxes.includes(tax.id)}
        onChange={(evt) => updateItem({ taxes: evt.target.checked ? [ ...item.taxes, tax.id ] : [ ...item.taxes.filter(item => item !== tax.id) ] })}
      />
      <label htmlFor={`ItemEditorTax_${tax.id}`}>{`${tax.name} (${tax.precentage}%)`}</label>
    </div>
  ));

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <Link className={styles.closeBtn} to={Routes.AdminItemList}>
          <ArrowLeftTwoTone />
        </Link>
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>{currentItem ? 'Edit Item' : 'Create Item'}</span>
        </div>
      </div>
      <div className={styles.form}>
        <div className={styles.control}>
          <label className={styles.controlLabel} htmlFor="ItemEditorName">
            Name
          </label>
          <input
            id="ItemEditorName"
            type="text"
            className={styles.controlInput}
            value={item.name}
            onChange={evt => updateItem({ name: evt.target.value })}
          />
        </div>
        <div className={styles.control}>
          <label className={styles.controlLabel} htmlFor="ItemEditorCategory">
            Category
          </label>
          <div className={styles.controlGroup}>
            <input
              readOnly
              type="text"
              id="ItemEditorCategory"
              className={`${styles.controlInput} ${isPickerShown ? 'focus' : ''}`}
              value={selectedCategoryName}
              onClick={() => togglePicker(true)}
            />
            {isPickerShown && (
              <CategoryPicker
                className={styles.picker}
                categories={categories}
                selected={currentItem?.parentId || 0}
                onChange={handleOnChangeCategoryPicker}
                onClose={() => togglePicker(false)}
              />
            )}
          </div>
        </div>
        <div className={styles.control}>
          <label className={styles.controlLabel} htmlFor="ItemEditorPrice">
            Price
          </label>
          <input
            type="number"
            className={styles.controlInput}
            id="ItemEditorPrice"
            placeholder="Price"
            value={item.price}
            onChange={evt => updateItem({ price: evt.target.value })}
          />
        </div>
        <div className={styles.control}>
          <label className={styles.controlLabel} htmlFor="ItemEditorCostPrice">
            Cost Price
          </label>
          <input
            type="number"
            className={styles.controlInput}
            id="ItemEditorCostPrice"
            placeholder="Cost Price"
            value={item.costPrice}
            onChange={evt => updateItem({ costPrice: evt.target.value })}
          />
        </div>
        <div className={styles.control}>
          <label className={styles.controlLabel} htmlFor="ItemEditorColor">
            Color
          </label>
          <select
            id="ItemEditorColor"
            className={styles.controlInput}
            value={item.color || 'transparent'}
            onChange={evt => updateItem({ color: evt.target.value })}
          >
            <optgroup label="Please specify the color">
              <option value="transparent">Default</option>
              <option value="salmon">Salmon</option>
              <option value="red">Red</option>
              <option value="coral">Coral</option>
              <option value="tomato">Tomato</option>
              <option value="gold">Gold</option>
              <option value="orange">Orange</option>
            </optgroup>
          </select>
        </div>
        <div className={styles.control}>
          <label className={styles.controlLabel} htmlFor="ItemEditorColor">
            Image
          </label>
          {!item.picture && <input
            type="file"
            className={styles.controlInput}
            onChange={evt => encodeImage(evt, (picture) => updateItem({ picture }))}
          />}
          {!!item.picture && (
            <button className={styles.secondaryAction} onClick={() => updateItem({ picture: '' })}>
              Remove
            </button>
          )}
        </div>
        <div>Taxes</div>
        {renderTaxList}
        <div className={styles.control}>
          <div className={styles.controlLabel} />
          <button className={styles.primaryAction} disabled={isInvalid} onClick={handleOnClickOnPrimaryBtn}>
            {currentItem ? 'Update' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemEditor;