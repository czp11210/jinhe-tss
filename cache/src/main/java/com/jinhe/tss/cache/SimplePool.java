/* ==================================================================   
 * Created [2007-1-3] by Jon.King 
 * ==================================================================  
 * TSS 
 * ================================================================== 
 * mailTo:jinpujun@hotmail.com
 * Copyright (c) Jon.King, 2012-2015 
 * ================================================================== 
 */
package com.jinhe.tss.cache;

import com.jinhe.tss.util.BeanUtil;

/**
 * 简单的缓存对象池，适合简单的缓存需求。 <br/>
 * 
 * 例如：模板、参数值等。
 */
public class SimplePool extends AbstractPool {

	private Container poolContainer; // 对象池容器

	public SimplePool() {
	}

	public final void init() {
		String poolCollectionClass = strategy.getPoolContainerClass();
		Class<?> collectionType = BeanUtil.createClassByName(poolCollectionClass);
		if (!Container.class.isAssignableFrom(collectionType)) {
			throw new RuntimeException("指定的池容器类类型非法: "
					+ collectionType.getName() + " (必须实现Container接口)");
		}

		ContainerFactory factory = ContainerFactory.getInstance();
		String containerName = strategy.getCode();
		poolContainer = factory.create(collectionType.getName(), containerName);

		log.info("缓存池【" + strategy.getName() + "】初始化成功！");
	}

	public final void release(final boolean forced) {
		if (released)
			return;

		poolContainer.clear();
		released = true;
	}

	public final Container getFree() {
		return poolContainer;
	}

	public final Container getUsing() {
		return poolContainer;
	}

	public final int size() {
		return poolContainer.size();
	}
}