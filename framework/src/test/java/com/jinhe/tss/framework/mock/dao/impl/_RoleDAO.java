package com.jinhe.tss.framework.mock.dao.impl;

import org.springframework.stereotype.Repository;

import com.jinhe.tss.framework.mock.dao._IRoleDAO;
import com.jinhe.tss.framework.mock.model._Role;
import com.jinhe.tss.framework.persistence.BaseDao;

@Repository("_RoleDAO")
public class _RoleDAO extends BaseDao<_Role> implements _IRoleDAO {

    public _RoleDAO() {
        super(_Role.class);
    }

}
